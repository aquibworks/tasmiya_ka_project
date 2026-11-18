import logging
import os
from logging.handlers import RotatingFileHandler

def setup_logger():
    log_dir = "src/logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    logger = logging.getLogger("QuantumIDS")
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")

    # File handler (saves to src/logs/app.log)
    file_handler = RotatingFileHandler(f"{log_dir}/app.log", maxBytes=10485760, backupCount=5)
    file_handler.setFormatter(formatter)

    # Console handler (shows in CMD)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    if not logger.handlers:
        logger.addHandler(file_handler)
        logger.addHandler(console_handler)

    return logger

logger = setup_logger()