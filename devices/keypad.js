const debug = require('debug')('ring-mqtt')
const AlarmDevice = require('./alarm-device')

class Keypad extends AlarmDevice {
    constructor(deviceInfo) {
        super(deviceInfo)

        // Device data for Home Assistant device registry
        this.deviceData.mdl = 'Security Keypad'

        if (this.config.enable_volume) {
            // Build required MQTT topics for volume control
            this.stateTopic_volume = this.deviceTopic+'/audio/volume_state'
            this.commandTopic_volume = this.deviceTopic+'/audio/volume_command'
            this.configTopic_volume = 'homeassistant/number/'+this.locationId+'/'+this.deviceId+'_volume/config'
        }
    }
        
    initDiscoveryData() {
        // Build the MQTT discovery messages if volume control is enabled
        if (this.stateTopic_volume) {
            this.discoveryData.push({
                message: {
                    name: this.device.name+' Volume',
                    unique_id: this.deviceId+'_volume',
                    availability_topic: this.availabilityTopic,
                    payload_available: 'online',
                    payload_not_available: 'offline',
                    state_topic: this.stateTopic_volume,
                    command_topic: this.commandTopic_volume,
                    min: 0,
                    max: 100,
                    device: this.deviceData
                },
                configTopic: this.configTopic_audio
            })
        }
        
        // Device has no sensors, only publish info data
        this.initInfoDiscoveryData()
    }

    publishData() {
        if (this.stateTopic_volume) {
            const currentVolume = (this.device.data.volume && !isNaN(this.device.data.volume) ? Math.round(100 * this.device.data.volume) : 0)
            // Publish device state
            this.publishMqtt(this.stateTopic_volume, currentVolume.toString(), true)
        }

        // Publish device attributes (batterylevel, tamper status)
        this.publishAttributes()
    }

    // Process messages from MQTT command topic
    processCommand(message, topic) {
        if (topic === this.commandTopic_volume) {
            this.setVolumeLevel(message)
        } else {
            debug('Received unknown command topic '+topic+' for keypad Id: '+this.deviceId)
        }
    }

    // Set switch target state on received MQTT command message
    setVolumeLevel(message) {
        const volume = message
        debug('Received set volume level to '+volume+'% for keypad Id: '+this.deviceId)
        debug('Location Id: '+ this.locationId)
        if (isNaN(message)) {
                debug('Volume command received but value not a number')
        } else if (!(message >= 0 && message <= 100)) {
            debug('Volume command received but out of range (0-100)')
        } else {
            this.device.setVolume(volume/100)
        }
    }

}

module.exports = Keypad
