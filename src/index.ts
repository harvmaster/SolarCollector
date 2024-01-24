import MQTT, { MqttClient } from 'mqtt'
import socketio, { Socket } from 'socket.io-client'

import config from '../config'

class SolarDataCollector {
  #socket?: Socket
  #mqtt?: MqttClient
  #id?: string

  async init() {
    this.#socket = await this.connectSocket()
    this.#mqtt = await this.connectMqtt()
  }

  connectSocket (): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = socketio(config.socketio.url)

      socket.on('connect', () => {
        console.log('connected to socket.io')
        socket.emit('join', {
          clientType: 'provider',
          data: {
            channelId: config.socketio.channelId,
            password: config.socketio.password,
          }
        })
        socket.on('joined', () => {
          console.log(`joined channel: ${config.socketio.channelId}`)
          resolve(socket)
        })
      })
      socket.on('connect_error', (err) => {
        console.log('error connecting to socket.io', err)
        reject(err)
      })
      socket.on('error', (err) => {
        console.log(err)
        if (err.error === 'No channel found') {
          console.log('No channel found, creating...')
          socket.emit('join', {
            clientType: 'provider',
            data: {
              channelId: config.socketio.channelId,
              password: config.socketio.password,
            }
          })
        }
      })
    })
  }

  connectMqtt (): Promise<MqttClient> {
    return new Promise((resolve, reject) => {
      console.log('Connecting to MQTT server at ' + config.vrm.ip + ':' + config.vrm.port + '...')
      const client = MQTT.connect(`mqtt://${config.vrm.ip}:${config.vrm.port}`)
      client.on('connect', () => {
        console.log('MQTT connected')
        client.subscribe('#', (err) => {
          if (err) {
            console.log('error subscribing', err)
          }
        })
        resolve(client)
      })

      // Create listener to call keepalive. This is what triggers data to be received
      client.once('message', (topic, message) => {
        const topicString = topic.toString()
        const messageString = message.toString()
        if (topicString.endsWith('system/0/Serial')) {
          const msg = JSON.parse(messageString)
          this.#id = msg.value
          this.keepAlive()
        }
      })
    })
  }

  keepAlive () {
    setInterval(() => {
      if (!this.#mqtt) throw new Error('MQTT not initialized')
      if (!this.#id) throw new Error('ID not initialized')

      this.#mqtt.publish(`R/${this.#id}/keepalive`, '')
    }, 10000)
  }

  handleMessage () {
    if (!this.#mqtt) throw new Error('MQTT not initialized')
    
    this.#mqtt.on('message', (topicRaw, messageRaw) => {
      if (!this.#socket) throw new Error('Socket not initialized')
      
      const topic = topicRaw.toString()
      const message = messageRaw.toString()

      const topicParts = topic.split('/')

      // topics we want
      // N/$id/system/0/Dc/:device/:value
      // i.e. N/123456789/system/0/Dc/Vebus/Power
      if (!topic.startsWith(`N/${this.#id}/system/0/Dc`)) return

      console.log(topic, message)

      const topics: {[key: string]: { [key: string]: (val: number) => void }} = {
        'Vebus': {
          'Power': (val) => this.#socket?.emit('update', { consumption: val })
        },
        'Battery': {
          'Voltage': (val) => this.#socket?.emit('update', { batteryVoltage: val }),
          'Soc': (val) => this.#socket?.emit('update', { battery: val })
        },
        'Pv': {
          'Power': (val) => this.#socket?.emit('update', { solar: val })
        },
      }
      
      const device = topicParts[5]
      const deviceTopic = topicParts[6]

      const msg = JSON.parse(message)
      const value = msg.value

      topics[device]?.[deviceTopic]?.(value);
    })
  }
}

const run = async () => {
  const collector = new SolarDataCollector()
  await collector.init()
  collector.handleMessage()
}

run()