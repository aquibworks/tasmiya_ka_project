from datetime import datetime

class StatusService:
    def __init__(self):
        self.statuses = {}  # run_id -> dict
    
    def start(self, run_id, stage):
        self.statuses[run_id] = {
            "stage": stage,
            "progress": 0,
            "message": f"Started {stage}",
            "started_at": datetime.utcnow().isoformat(),
            "completed": False
        }
    
    def update(self, run_id, stage, progress, message):
        if run_id in self.statuses:
            self.statuses[run_id].update({
                "stage": stage,
                "progress": progress,
                "message": message
            })
    
    def complete(self, run_id, message="Completed"):
        if run_id in self.statuses:
            self.statuses[run_id].update({
                "progress": 100, "message": message, "completed": True
            })
    
    def get(self, run_id):
        return self.statuses.get(run_id, {"message": "Unknown run_id"})

status_service = StatusService()