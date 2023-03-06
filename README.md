## Accessing Executables
All platform executables are directly accessible from the Github release. 

### M1 Mac
Rosetta needs to be installed
```
softwareupdate --install-rosetta
```

## Launching Server in HTTPS
To launch the server in HTTPS without having any security issues with the browser, it is necessary to add an entry to the DNS: 
```shared-schema.panda.st``` with the IP address of the machine that launches the executable.

This ensures that the server is securely accessible from the browser without any security warnings.


