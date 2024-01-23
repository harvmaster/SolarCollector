# SolarMQTT
Simple test to read the realtime data of Victron CCGX Device

# Config 
```ts
const config = {
  vrm: {
    ip: 'Your CCGX devices local ip address'
    port: 1883 // This may need to change, but i found this port to work
  },
  socketio: {
    url: 'URL to socket.io server',
    channelId: 'Channel you want to publish your solar data to on the api',
    password: 'Password for authenticating with api'
  }
}

export default config
```

# Useful Links
- [Describes how to connect to mqtt](https://community.victronenergy.com/questions/155407/mqtt-local-via-mqtt-broker.html)
- [Example Connection Code](https://community.victronenergy.com/questions/135757/mqtt-jsts-implementation.html)