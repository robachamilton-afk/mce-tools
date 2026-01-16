"""
Safe Equation Interpreter

Safely evaluates mathematical equations extracted from performance contracts.

Author: Manus AI
Date: January 12, 2026
"""

import ast
import operator
import math
from typing import Dict, Any, Optional
import re


class EquationInterpreter:
    """
    Safely interprets and evaluates mathematical equations from contracts.
    
    Uses Python's AST (Abstract Syntax Tree) to parse and evaluate equations
    in a sandboxed environment, preventing code injection attacks.
    """
    
    # Allowed operators
    OPERATORS = {
        ast.Add: operator.add,
        ast.Sub: operator.sub,
        ast.Mult: operator.mul,
        ast.Div: operator.truediv,
        ast.Pow: operator.pow,
        ast.USub: operator.neg,
        ast.UAdd: operator.pos,
    }
    
    # Allowed functions
    FUNCTIONS = {
        'abs': abs,
        'min': min,
        'max': max,
        'round': round,
        'sqrt': math.sqrt,
        'exp': math.exp,
        'log': math.log,
        'log10': math.log10,
        'sin': math.sin,
        'cos': math.cos,
        'tan': math.tan,
        'pow': pow,
    }
    
    def __init__(self):
        """Initialize the interpreter."""
        pass
    
    def normalize_equation(self, equation: str) -> str:
        """
        Normalize an equation string for parsing.
        
        Handles common variations in equation formatting:
        - Converts × to *
        - Converts ÷ to /
        - Removes whitespace
        - Handles implicit multiplication (e.g., 2x -> 2*x)
        
        Args:
            equation: Raw equation string
            
        Returns:
            Normalized equation string
        """
        # Replace unicode operators
        equation = equation.replace('×', '*')
        equation = equation.replace('÷', '/')
        equation = equation.replace('−', '-')  # Unicode minus
        
        # Handle implicit multiplication (e.g., 2x -> 2*x)
        equation = re.sub(r'(\d)([a-zA-Z_])', r'\1*\2', equation)
        equation = re.sub(r'([a-zA-Z_])(\d)', r'\1*\2', equation)
        equation = re.sub(r'\)(\d)', r')*\1', equation)
        equation = re.sub(r'(\d)\(', r'\1*(', equation)
        
        return equation.strip()
    
    def _eval_node(self, node, variables: Dict[str, Any]):
        """
        Recursively evaluate an AST node.
        
        Args:
            node: AST node to evaluate
            variables: Dictionary of variable values
            
        Returns:
            Evaluated result
        """
        if isinstance(node, ast.Constant):  # Python 3.8+
            return node.value
        elif isinstance(node, ast.Num):  # Python 3.7 and earlier
            return node.n
        elif isinstance(node, ast.Name):
            # Variable lookup
            if node.id not in variables:
                raise ValueError(f"Undefined variable: {node.id}")
            return variables[node.id]
        elif isinstance(node, ast.BinOp):
            # Binary operation (e.g., a + b)
            left = self._eval_node(node.left, variables)
            right = self._eval_node(node.right, variables)
            op = self.OPERATORS.get(type(node.op))
            if op is None:
                raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
            return op(left, right)
        elif isinstance(node, ast.UnaryOp):
            # Unary operation (e.g., -a)
            operand = self._eval_node(node.operand, variables)
            op = self.OPERATORS.get(type(node.op))
            if op is None:
                raise ValueError(f"Unsupported unary operator: {type(node.op).__name__}")
            return op(operand)
        elif isinstance(node, ast.Call):
            # Function call (e.g., sqrt(x))
            func_name = node.func.id if isinstance(node.func, ast.Name) else None
            if func_name not in self.FUNCTIONS:
                raise ValueError(f"Unsupported function: {func_name}")
            
            args = [self._eval_node(arg, variables) for arg in node.args]
            return self.FUNCTIONS[func_name](*args)
        elif isinstance(node, ast.IfExp):
            # Conditional expression (e.g., a if condition else b)
            test = self._eval_node(node.test, variables)
            if test:
                return self._eval_node(node.body, variables)
            else:
                return self._eval_node(node.orelse, variables)
        elif isinstance(node, ast.Compare):
            # Comparison (e.g., a > b)
            left = self._eval_node(node.left, variables)
            for op, comparator in zip(node.ops, node.comparators):
                right = self._eval_node(comparator, variables)
                if isinstance(op, ast.Gt):
                    if not (left > right):
                        return False
                elif isinstance(op, ast.GtE):
                    if not (left >= right):
                        return False
                elif isinstance(op, ast.Lt):
                    if not (left < right):
                        return False
                elif isinstance(op, ast.LtE):
                    if not (left <= right):
                        return False
                elif isinstance(op, ast.Eq):
                    if not (left == right):
                        return False
                elif isinstance(op, ast.NotEq):
                    if not (left != right):
                        return False
                else:
                    raise ValueError(f"Unsupported comparison: {type(op).__name__}")
                left = right
            return True
        else:
            raise ValueError(f"Unsupported AST node: {type(node).__name__}")
    
    def evaluate(
        self,
        equation: str,
        variables: Dict[str, Any]
    ) -> float:
        """
        Safely evaluate an equation with given variable values.
        
        Args:
            equation: Equation string (e.g., "G_poa * Area * 0.85")
            variables: Dictionary of variable values
            
        Returns:
            Evaluated result as a float
            
        Raises:
            ValueError: If equation is invalid or contains unsupported operations
            SyntaxError: If equation has syntax errors
        """
        # Normalize the equation
        equation = self.normalize_equation(equation)
        
        try:
            # Parse the equation into an AST
            tree = ast.parse(equation, mode='eval')
            
            # Evaluate the AST
            result = self._eval_node(tree.body, variables)
            
            return float(result)
            
        except SyntaxError as e:
            raise SyntaxError(f"Invalid equation syntax: {equation}") from e
        except Exception as e:
            raise ValueError(f"Error evaluating equation '{equation}': {str(e)}") from e
    
    def validate_equation(self, equation: str) -> tuple[bool, Optional[str]]:
        """
        Validate an equation without evaluating it.
        
        Args:
            equation: Equation string to validate
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            equation = self.normalize_equation(equation)
            tree = ast.parse(equation, mode='eval')
            
            # Check that all operations are allowed
            for node in ast.walk(tree):
                if isinstance(node, ast.BinOp):
                    if type(node.op) not in self.OPERATORS:
                        return False, f"Unsupported operator: {type(node.op).__name__}"
                elif isinstance(node, ast.UnaryOp):
                    if type(node.op) not in self.OPERATORS:
                        return False, f"Unsupported unary operator: {type(node.op).__name__}"
                elif isinstance(node, ast.Call):
                    func_name = node.func.id if isinstance(node.func, ast.Name) else None
                    if func_name not in self.FUNCTIONS:
                        return False, f"Unsupported function: {func_name}"
            
            return True, None
            
        except SyntaxError as e:
            return False, f"Syntax error: {str(e)}"
        except Exception as e:
            return False, f"Validation error: {str(e)}"
    
    def extract_variables(self, equation: str) -> list[str]:
        """
        Extract all variable names from an equation.
        
        Args:
            equation: Equation string
            
        Returns:
            List of variable names
        """
        try:
            equation = self.normalize_equation(equation)
            tree = ast.parse(equation, mode='eval')
            
            variables = []
            for node in ast.walk(tree):
                if isinstance(node, ast.Name):
                    if node.id not in self.FUNCTIONS:
                        variables.append(node.id)
            
            return list(set(variables))  # Remove duplicates
            
        except Exception:
            return []


# Example usage
if __name__ == "__main__":
    interpreter = EquationInterpreter()
    
    # Example 1: Simple equation
    equation1 = "G_poa * Area * 0.85"
    variables1 = {
        'G_poa': 800,  # W/m²
        'Area': 500000  # m²
    }
    
    print("Example 1: Expected Energy Calculation")
    print(f"Equation: {equation1}")
    print(f"Variables: {variables1}")
    result1 = interpreter.evaluate(equation1, variables1)
    print(f"Result: {result1:,.2f}")
    print()
    
    # Example 2: Complex equation with temperature correction
    equation2 = "(G_poa * Area * 1000) * (1 - (T_mod - 25) * Temp_Coeff) * PR_baseline"
    variables2 = {
        'G_poa': 0.8,  # kW/m²
        'Area': 500000,  # m²
        'T_mod': 45,  # °C
        'Temp_Coeff': 0.004,  # per °C
        'PR_baseline': 0.85
    }
    
    print("Example 2: Temperature-Corrected Expected Energy")
    print(f"Equation: {equation2}")
    print(f"Variables: {variables2}")
    result2 = interpreter.evaluate(equation2, variables2)
    print(f"Result: {result2:,.2f} kWh")
    print()
    
    # Example 3: Performance Ratio calculation
    equation3 = "(Actual_Energy_kWh / Expected_Energy_kWh) * 100"
    variables3 = {
        'Actual_Energy_kWh': 320000,
        'Expected_Energy_kWh': 380000
    }
    
    print("Example 3: Performance Ratio")
    print(f"Equation: {equation3}")
    print(f"Variables: {variables3}")
    result3 = interpreter.evaluate(equation3, variables3)
    print(f"Result: {result3:.2f}%")
    print()
    
    # Example 4: Validate an equation
    print("Example 4: Equation Validation")
    test_equation = "sqrt(G_poa) * max(Area, 1000)"
    is_valid, error = interpreter.validate_equation(test_equation)
    print(f"Equation: {test_equation}")
    print(f"Valid: {is_valid}")
    if error:
        print(f"Error: {error}")
    
    # Extract variables
    vars_found = interpreter.extract_variables(test_equation)
    print(f"Variables found: {vars_found}")
