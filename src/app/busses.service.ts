import { Injectable } from '@angular/core';
import { Subscription } from 'rxjs';
import { MqttService, IMqttMessage, IMqttServiceOptions } from 'ngx-mqtt';
import { divIcon, marker } from 'leaflet';

export const MQTT_SERVICE_OPTIONS: IMqttServiceOptions = {
  hostname: 'mqtt.hsl.fi',
  port: 443,
  protocol: 'wss',
  path: ''
};

export interface BusLocationMessage {
  VP: {
    oper: any,
    veh: any,
    lat: any,
    long: any,
  }
};

@Injectable({
  providedIn: 'root'
})
export class BussesService {
  public busses
  public map
  public bus_message: BusLocationMessage;
  private bus_subscription: Subscription;
  
  constructor(private _mqttService: MqttService) {
    //_mqttService.connect(MQTT_SERVICE_OPTIONS);
    this.bus_subscription = this._mqttService.observe('/hfp/v1/journey/#').subscribe((message: IMqttMessage) => {
      this.bus_message = <BusLocationMessage>JSON.parse(message.payload.toString())
      try {
        if(!this.map.getBounds().contains([this.bus_message.VP.lat, this.bus_message.VP.long])){
          return;
        }
      } catch (error) {
        return
      }
      
      const vehicleId = parseInt(this.bus_message.VP.oper + "" + this.bus_message.VP.veh);

      //Update vehicle to vehicles list
      //Give the marker object to the new vehicle in the list
      let old_vehicle_data = this.busses[vehicleId];
      if(old_vehicle_data != undefined){
        let marker_obj = old_vehicle_data.marker;
        this.busses[vehicleId] = this.bus_message.VP;
        this.busses[vehicleId].marker = marker_obj;

        const bad = Math.abs(this.busses[vehicleId].dl)/1.5
        const green = 255-bad*1.5
        const other_color = bad

        let myCustomColour
        if(this.busses[vehicleId].dl < 0){
          myCustomColour = 'rgba('+other_color+', '+green+', 0, 1)'
        }else{
          myCustomColour = 'rgba(0, '+green+', '+other_color+', 1)'
        }

        const markerHtmlStyles = `
          background-color: ${myCustomColour};
          width: 2rem;
          height: 2rem;
          display: block;
          position: relative;
          border-radius: 3rem 3rem 0;
          transform: rotate(${this.busses[vehicleId].hdg + 225}deg);
          border: 1px solid #FFFFFF`

        this.busses[vehicleId].marker.setLatLng([this.bus_message.VP.lat, this.bus_message.VP.long]);
        this.busses[vehicleId].marker.bindPopup('I am: ' + ((this.busses[vehicleId].dl <= 0) ? 
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Late'): 
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Early')
        ))

        this.busses[vehicleId].marker.setIcon(divIcon({
          className: "my-custom-pin",
          iconAnchor: [0, 24],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}"><center style='transform: rotate(${-this.busses[vehicleId].hdg - 225}deg)'>${this.busses[vehicleId].desi}</center></span>`
        }));
      }else{
        this.busses[vehicleId] = this.bus_message.VP;
        this.addMarker(this.bus_message.VP.lat, this.bus_message.VP.long, vehicleId);
      }
      /*let all_vehicles_total_lateness = 0;
      let medium_value_vehicle_amount = 0;
      for (const key in this.vehicles) {
        if (this.vehicles.hasOwnProperty(key)) {
          const vehicle = this.vehicles[key];
          if(vehicle.dl < 0 && vehicle.dl > -1200){
            all_vehicles_total_lateness -= vehicle.dl;
            medium_value_vehicle_amount += 1;
          }
        }
      }
      console.log(all_vehicles_total_lateness/medium_value_vehicle_amount)*/
    });
  }
  addMarker(lat: any, long: any, vehicleId: number) {

    const bad = Math.abs(this.busses[vehicleId].dl)/1.5
    const green = 255-bad
    const red = bad

    let myCustomColour
    if(this.busses[vehicleId].dl < 0){
      myCustomColour = 'rgba('+red+', '+green+', 0, 1)'
    }else{
      myCustomColour = 'rgba(0, '+green+', '+red+', 1)'
    }
    

    const markerHtmlStyles = `
    background-color: ${myCustomColour};
    width: 2rem;
    height: 2rem;
    display: block;
    position: relative;
    border-radius: 3rem 3rem 0;
    transform: rotate(${this.busses[vehicleId].hdg + 225}deg);
    border: 1px solid #FFFFFF`

		let newMarker = marker([ lat, long ],
			{icon: divIcon({
        className: "my-custom-pin",
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
        html: `<span style="${markerHtmlStyles}"><center style='transform: rotate(${-this.busses[vehicleId].hdg - 225}deg)'>${this.busses[vehicleId].desi}</center></span>`
      })}
    );
    this.busses[vehicleId].marker = newMarker;
    this.map.markers.push(newMarker);
  }
  public ngOnDestroy() {
    this.bus_subscription.unsubscribe();
  }
  public toMMSS(sec_num: number) {
    var minutes = Math.floor(sec_num / 60);
    var seconds = sec_num - (minutes * 60);
    let m_ = minutes + 'm'
    let s_ = seconds + 's'
    if (minutes < 10) {m_ = '0'+m_;}
    if (seconds < 10) {s_ = '0'+s_;}
    return m_+' '+s_+' ';
  }
  public unsafePublish(topic: string, message: string): void {
    this._mqttService.unsafePublish(topic, message, {qos: 1, retain: true});
  }
}
