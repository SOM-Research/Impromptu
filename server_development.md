In order to the start-up of the server mode, it is recommend tu use a proccess manager such as **pm2**. 

### PM2 instalation

Use **npm** to install pm2:
``` 
npm install -g pm2
```

One can check that the installation was succesful by checking the version:
```
pm2 -v
```

In order to get access eficiently to all your proccess from your project file, PM2 employs an ecosystem configuration file. You can generate these file by the command:

```
pm2 init simple
```
This command would create the file `ecosystem.config.js` in the workplace, where you can write the configuration of the servers the application would need.


### Launching the server

The server entrance is located in the folder `bin/server_main.js` of Impromptu. Therefore, in order to start Impromptu's server, it is important to **change the current directory**, since some validations depend on it. That means that you have to write where the script of the server is inside that directory (`bin/server_main.js` in Impromptu's case), and you can write a name to identify the service.

For example, if we add Impromptu inside the `opt` folder of our project, where we have created the file `ecosystem.config.js`, we should add in it:


```
module.exports = {
    "apps": [
        {
           "name": "impromptu",
           "cwd": "/opt/Impromptu",
           "script": "bin/server_main.js",
           "env": {
              "NODE_ENV": "production"
           }
        }
    ...
    ]
}
```





