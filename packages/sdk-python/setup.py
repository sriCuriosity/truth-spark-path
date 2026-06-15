from setuptools import setup, find_packages

setup(
    name="nexus-cortex-sdk",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "requests>=2.25.0",
    ],
    author="NEXUS Core",
    description="Python client wrapper for the NEXUS sovereign education system",
    python_requires=">=3.7",
)
