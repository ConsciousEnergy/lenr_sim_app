import re

# Path to the file
file_path = "backend/app/physics/potential_models.py"

# Read the file content
with open(file_path, 'r') as file:
    content = file.read()

# Find the PotentialParameters class definition
class_pattern = r'class PotentialParameters.*?def __init__.*?# Additional parameters.*?setattr\(self, key, value\)'
class_match = re.search(class_pattern, content, re.DOTALL)

if class_match:
    # Get the matched class definition
    class_def = class_match.group(0)
    
    # Create the updated class definition with the copy method
    updated_class_def = class_def + '''
            
    def copy(self):
        """Create a copy of the potential parameters."""
        params_copy = PotentialParameters(
            model_type=self.model_type,
            depth=self.depth,
            width=self.width,
            equilibrium_position=self.equilibrium_position,
            spring_constant=self.spring_constant,
            reference_point=self.reference_point
        )
        
        # Copy any additional attributes
        for key, value in self.__dict__.items():
            if key not in ["model_type", "depth", "width", "equilibrium_position", 
                          "spring_constant", "reference_point"]:
                setattr(params_copy, key, value)
                
        return params_copy'''
    
    # Replace the old class definition with the updated one
    updated_content = content.replace(class_def, updated_class_def)
    
    # Write the updated content back to the file
    with open(file_path, 'w') as file:
        file.write(updated_content)
    
    print(f"Successfully added copy method to PotentialParameters class in {file_path}")
else:
    print("Could not find PotentialParameters class in the file") 