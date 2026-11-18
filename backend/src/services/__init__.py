import os

from fastapi import logger

class DataService:
    def __init__(self):
        # Get the absolute directory of the current file (src/services)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # Go up two levels to get to 'backend', then into 'src/data'
        base_dir = os.path.dirname(os.path.dirname(current_dir))
        
        self.train_path = os.path.join(base_dir, "src", "data", "KDDTrain+.txt")
        self.test_path = os.path.join(base_dir, "src", "data", "KDDTest+.txt")
        self.models_dir = os.path.join(base_dir, "src", "data", "saved_models")
        
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)
            
        logger.info(f"DataService initialized. Train path: {self.train_path}")