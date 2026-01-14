import { useEffect, useState, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Check, X, Plus } from "lucide-react";


type EquipmentType = "pcu" | "substation" | "combiner_box" | "transformer" | "other";

interface EquipmentMarker {
  id: number;
  type: EquipmentType;
  lat: number;
  lng: number;
  status: "auto_detected" | "user_verified" | "user_added";
  confidence?: number;
}

export default function EquipmentTagging() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const siteId = parseInt(params.id || "0");

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.marker.AdvancedMarkerElement[]>([]);
  const [selectedType, setSelectedType] = useState<EquipmentType>("pcu");
  const [isAddingMode, setIsAddingMode] = useState(false);

  const { data: site, isLoading: siteLoading } = trpc.sites.getById.useQuery({ id: siteId });
  const { data: equipment, isLoading: equipmentLoading, refetch } = trpc.equipment.getBySiteId.useQuery({ siteId });
  
  const addMutation = trpc.equipment.add.useMutation({
    onSuccess: () => {
      refetch();
      // Equipment added successfully
      setIsAddingMode(false);
    },
  });

  const verifyMutation = trpc.equipment.verify.useMutation({
    onSuccess: () => {
      refetch();
      // Equipment verified successfully
    },
  });

  const deleteMutation = trpc.equipment.delete.useMutation({
    onSuccess: () => {
      refetch();
      // Equipment deleted successfully
    },
  });

  const updateLocationMutation = trpc.equipment.updateLocation.useMutation({
    onSuccess: () => {
      refetch();
      // Location updated successfully
    },
  });

  // Initialize map
  const handleMapReady = useCallback((googleMap: google.maps.Map) => {
    setMap(googleMap);
  }, []);

  // Update markers when equipment data changes
  useEffect(() => {
    if (!map || !equipment) return;

    // Clear existing markers
    markers.forEach(marker => marker.map = null);
    setMarkers([]);

    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    const bounds = new google.maps.LatLngBounds();

    equipment.forEach((item: any) => {
      const lat = parseFloat(item.latitude);
      const lng = parseFloat(item.longitude);

      // Create marker element
      const markerEl = document.createElement("div");
      markerEl.className = "equipment-marker";
      markerEl.style.cssText = `
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 3px solid ${item.status === "user_verified" ? "#22c55e" : item.status === "auto_detected" ? "#f59e0b" : "#3b82f6"};
        background: white;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 16px;
      `;
      markerEl.textContent = getEquipmentIcon(item.type);

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: lat, lng: lng } as google.maps.LatLngLiteral,
        content: markerEl,
        title: `${item.type} (${item.status})`,
        gmpDraggable: true,
      });

      // Handle marker drag
      marker.addListener("dragend", () => {
        const pos = marker.position as any;
        if (pos) {
          const newLat = typeof pos.lat === 'function' ? (pos as google.maps.LatLng).lat() : pos.lat;
          const newLng = typeof pos.lng === 'function' ? (pos as google.maps.LatLng).lng() : pos.lng;
          updateLocationMutation.mutate({
            id: item.id,
            latitude: newLat,
            longitude: newLng,
          });
        }
      });

      // Handle marker click
      markerEl.addEventListener("click", () => {
        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="padding: 8px;">
              <h3 style="margin: 0 0 8px 0; font-weight: 600;">${item.type.replace("_", " ").toUpperCase()}</h3>
              <p style="margin: 4px 0; font-size: 12px;">Status: ${item.status}</p>
              ${item.confidence ? `<p style="margin: 4px 0; font-size: 12px;">Confidence: ${item.confidence}%</p>` : ""}
              <div style="margin-top: 12px; display: flex; gap: 8px;">
                ${item.status === "auto_detected" ? `<button id="verify-${item.id}" style="padding: 4px 12px; background: #22c55e; color: white; border: none; border-radius: 4px; cursor: pointer;">Verify</button>` : ""}
                <button id="delete-${item.id}" style="padding: 4px 12px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
              </div>
            </div>
          `,
        });

        infoWindow.open(map, marker as any);

        // Add event listeners after content is rendered
        setTimeout(() => {
          const verifyBtn = document.getElementById(`verify-${item.id}`);
          const deleteBtn = document.getElementById(`delete-${item.id}`);
          
          if (verifyBtn) {
            verifyBtn.addEventListener("click", () => {
              verifyMutation.mutate({ id: item.id });
              infoWindow.close();
            });
          }
          
          if (deleteBtn) {
            deleteBtn.addEventListener("click", () => {
              deleteMutation.mutate({ id: item.id });
              infoWindow.close();
            });
          }
        }, 100);
      });

      newMarkers.push(marker);
      bounds.extend({ lat, lng });
    });

    setMarkers(newMarkers);
    
    // Auto-zoom to fit all equipment markers
    if (equipment.length > 0) {
      map.fitBounds(bounds);
      // Add some padding
      const listener = google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
        const currentZoom = map.getZoom();
        if (currentZoom && currentZoom > 18) {
          map.setZoom(18); // Don't zoom in too much
        }
      });
    }
  }, [map, equipment]); // Don't include mutation objects in dependencies

  // Handle map click to add equipment
  useEffect(() => {
    if (!map || !isAddingMode) return;

    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        addMutation.mutate({
          siteId,
          type: selectedType,
          latitude: e.latLng.lat(),
          longitude: e.latLng.lng(),
        });
      }
    });

    return () => {
      google.maps.event.removeListener(listener);
    };
  }, [map, isAddingMode, selectedType, siteId]); // Don't include addMutation in dependencies

  if (siteLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!site) {
    return (
      <div className="container py-8">
        <p>Site not found</p>
      </div>
    );
  }

  const lat = parseFloat(site.latitude || "0");
  const lng = parseFloat(site.longitude || "0");

  const equipmentCounts = equipment?.reduce((acc: Record<string, number>, item: any) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {}) || {};

  const verifiedCount = equipment?.filter((e: any) => e.status === "user_verified").length || 0;
  const autoDetectedCount = equipment?.filter((e: any) => e.status === "auto_detected").length || 0;

  return (
    <div className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" onClick={() => setLocation(`/site/${siteId}`)}>
          ← Back to Site
        </Button>
        <h1 className="text-3xl font-bold mt-4">{site.name}</h1>
        <p className="text-muted-foreground">Equipment Tagging & Verification</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Interactive Map</CardTitle>
              <CardDescription>
                {isAddingMode
                  ? `Click on the map to add a ${selectedType.replace("_", " ")}`
                  : "Click markers to verify or delete equipment"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px] rounded-lg overflow-hidden">
                <MapView
                  initialCenter={{ lat, lng }}
                  initialZoom={17}
                  mapTypeId="satellite"
                  onMapReady={handleMapReady}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls & Summary */}
        <div className="space-y-6">
          {/* Add Equipment */}
          <Card>
            <CardHeader>
              <CardTitle>Add Equipment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as EquipmentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pcu">PCU / Inverter</SelectItem>
                  <SelectItem value="substation">Substation</SelectItem>
                  <SelectItem value="combiner_box">Combiner Box</SelectItem>
                  <SelectItem value="transformer">Transformer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              <Button
                className="w-full"
                variant={isAddingMode ? "destructive" : "default"}
                onClick={() => setIsAddingMode(!isAddingMode)}
              >
                {isAddingMode ? (
                  <>
                    <X className="mr-2 h-4 w-4" />
                    Cancel Adding
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add {selectedType.replace("_", " ")}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Status</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-green-500">Verified</Badge>
                    <span className="text-sm font-mono">{verifiedCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant="default" className="bg-amber-500">Auto-detected</Badge>
                    <span className="text-sm font-mono">{autoDetectedCount}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Equipment Types</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(equipmentCounts).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm">{type.replace("_", " ").toUpperCase()}</span>
                      <span className="text-sm font-mono">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Equipment</span>
                  <span className="text-2xl font-bold">{equipment?.length || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle>Marker Legend</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-green-500 bg-white"></div>
                <span className="text-sm">Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-amber-500 bg-white"></div>
                <span className="text-sm">Auto-detected</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-500 bg-white"></div>
                <span className="text-sm">User-added</span>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Drag markers to adjust location. Click markers to verify or delete.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function getEquipmentIcon(type: string): string {
  switch (type) {
    case "pcu":
      return "⚡";
    case "substation":
      return "🔌";
    case "combiner_box":
      return "📦";
    case "transformer":
      return "🔋";
    default:
      return "📍";
  }
}
