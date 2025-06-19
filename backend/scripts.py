#!/usr/bin/env python3
"""
Development scripts for the backend.
"""

import subprocess
import sys


def run_command(command, description):
    """Run a command and handle errors."""
    print(f"Running: {description}")
    try:
        result = subprocess.run(
            command, shell=True, check=True, capture_output=True, text=True
        )
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        print(f"Output: {e.stdout}")
        print(f"Error: {e.stderr}")
        return False


def main():
    """Main script entry point."""
    if len(sys.argv) < 2:
        print("Usage: python scripts.py <command>")
        print("Available commands:")
        print("  dev     - Start development server")
        print("  lint    - Run ruff linting")
        print("  format  - Run black formatting")
        print("  install - Install dependencies")
        print("  test    - Run tests")
        return

    command = sys.argv[1]

    if command == "dev":
        run_command(
            "uvicorn main:app --reload --host 0.0.0.0 --port 8000",
            "Starting development server",
        )
    elif command == "lint":
        run_command("ruff check .", "Running ruff linting")
    elif command == "format":
        run_command("black .", "Running black formatting")
    elif command == "install":
        run_command("uv pip install -r requirements.txt", "Installing dependencies")
    elif command == "test":
        print("Tests not implemented yet")
    else:
        print(f"Unknown command: {command}")


if __name__ == "__main__":
    main()
