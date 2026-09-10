To create and use a Python virtual environment on macOS, navigate to your project directory and run python3 -m venv .venv to generate an isolated environment.  Activate it using source .venv/bin/activate, which prefixes your terminal prompt with (.venv) to confirm activation. 

Key commands for management include:

Install packages: Use pip install <package> to add dependencies only to the current environment.
Save dependencies: Run pip freeze > requirements.txt to export the current environment's packages.
Restore dependencies: Use pip install -r requirements.txt to install packages from a file. 
Deactivate: Run deactivate to exit the virtual environment and return to the system Python.
Always add .venv/ to your project's .gitignore file to prevent committing the virtual environment itself.  If you encounter permission errors or the externally-managed-environment error with newer Python versions, ensure you are running pip commands only after activating the environment. 