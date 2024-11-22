In order to the start-up of the server mode, it is recommend tu use a proccess manager such as **pm2** 

### PM2 instalation

Use **npm** to isntall pm2:
``` 
npm install -g pm2
```

One can check that the installation was succesful by checking the version:
```
pm2 -v
```

### Launching the server

The server is located in the forlder `bin/server_main.js` of Impromptu. Since for the correct performance of the server **has to be ejecuted from an specific working directory**, in order to open the server correctely:

- Open the server from the **Impromptu** main folder as a workspace

- Create a configuration file that pass the wanted cwd as variable


```
{
    "apps": [
        {
           "name": "impromptu",
           "cwd": "/opt/impromptu",
           "script": "bin/server_main.js",
           "env": {
              "NODE_ENV": "production"
           }
        }
    ]
}
```





