import MQTT from 'mqtt'

export const connecToSystem = async (ip: string, port: number) => {
  return new Promise((resolve, reject) => {
    const client = MQTT.connect(`mqtt://${ip}:${port}`)
    client.on('connect', () => {
      console.log('connected')
      client.subscribe('#', (err) => {
        if (err) {
          console.log('error subscribing', err)
          reject(err)
        }
      })
      resolve(client)
    })
  })
}

export default connecToSystem