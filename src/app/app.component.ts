import { Component } from '@angular/core';
import { tileLayer, latLng, Layer, marker, icon, divIcon} from 'leaflet';
import {MqttService, IMqttMessage} from 'ngx-mqtt';
import { Subscription } from 'rxjs/Subscription';
import { longStackSupport } from 'q';

export interface BusLocationMessage {
  VP: {
    oper: any,
    veh: any,
    lat: any,
    long: any,
  }
};

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  private subscription: Subscription;
  public message: BusLocationMessage;
  public vehicles = [];

  title = 'bussikartta';
  markers: Layer[] = [];
  options = {
    layers: [
      tileLayer('https://cdn.digitransit.fi/map/v1/hsl-map/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' })
    ],
    zoom: 11,
    center: latLng(60.222314, 24.892475)
  };


  constructor(private _mqttService: MqttService) {
    this.subscription = this._mqttService.observe('/hfp/v1/journey/#').subscribe((message: IMqttMessage) => {
      this.message = <BusLocationMessage>JSON.parse(message.payload.toString())
      const vehicleId = parseInt(this.message.VP.oper + "" + this.message.VP.veh);

      if(this.message.VP == undefined || this.message.VP == null || 
        this.message.VP.lat == null || this.message.VP.lat == undefined){
        return;
        }

      //Update vehicle to vehicles list
      //Give the marker object to the new vehicle in the list
      let old_vehicle_data = this.vehicles[vehicleId];
      if(old_vehicle_data != undefined){
        let marker_obj = old_vehicle_data.marker;
        this.vehicles[vehicleId] = this.message.VP;
        this.vehicles[vehicleId].marker = marker_obj;

        const bad = Math.abs(this.vehicles[vehicleId].dl)/1.5
        const green = 255-bad*1.5
        const red = bad

        const myCustomColour = 'rgba('+red+', '+green+', 0, 1)'
        const markerHtmlStyles = `
          background-color: ${myCustomColour};
          width: 2rem;
          height: 2rem;
          display: block;
          position: relative;
          border-radius: 3rem 3rem 0;
          transform: rotate(${this.vehicles[vehicleId].hdg + 225}deg);
          border: 1px solid #FFFFFF`

        this.vehicles[vehicleId].marker.setLatLng([this.message.VP.lat, this.message.VP.long]);
        this.vehicles[vehicleId].marker.bindPopup('I am: ' + this.toHHMMSS(-this.vehicles[vehicleId].dl) + ' late')
        this.vehicles[vehicleId].marker.setIcon(divIcon({
          className: "my-custom-pin",
          iconAnchor: [0, 24],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}"><center style='transform: rotate(${-this.vehicles[vehicleId].hdg - 225}deg)'>${this.vehicles[vehicleId].desi}</center></span>`
        }));
      }else{
        this.vehicles[vehicleId] = this.message.VP;
        this.addMarker(this.message.VP.lat, this.message.VP.long, vehicleId);
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
  public toHHMMSS(sec_num: number) {
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
  
  public ngOnDestroy() {
    this.subscription.unsubscribe();
  }

	addMarker(lat: any, long: any, vehicleId: number) {

    const bad = Math.abs(this.vehicles[vehicleId].dl)/1.5
    const green = 255-bad
    const red = bad

    const myCustomColour = 'rgba('+red+', '+green+', 0, 1)'
    const markerHtmlStyles = `
      background-color: ${myCustomColour};
      width: 1.5rem;
      height: 1.5rem;
      display: block;
      left: -1.5rem;
      top: -1.5rem;
      position: relative;
      border-radius: 3rem 3rem 0;
      transform: rotate(45deg);
      border: 1px solid #FFFFFF`

		let newMarker = marker([ lat, long ],
			{icon: divIcon({
        className: "my-custom-pin",
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
        html: `<span style="${markerHtmlStyles}" />`
      })}
    );
    this.vehicles[vehicleId].marker = newMarker;
    this.markers.push(newMarker);
	}
}
