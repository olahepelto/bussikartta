import { Injectable } from '@angular/core';
import { Subscription, Observable, interval } from 'rxjs';
import { MqttService, IMqttMessage, IMqttServiceOptions } from 'ngx-mqtt';
import { divIcon, marker } from 'leaflet';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

export interface BusLocationMessage {
  oper: any;
  veh: any;
  lat: any;
  long: any;
  hdg: any;
  dl: any;
  desi: any;
}

@Injectable({
  providedIn: 'root'
})
export class BussesService {
  public busses = [];
  public mainComponent;
  public bus_message: BusLocationMessage;
  private bus_subscription: Subscription;
  public translate = 1;
  public count = 0;

  public endpoint = 'https://tetrium.fi:5757/';
  public httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  private extractData(res: Response) {
    const body = res;
    return body || {};
  }
  getProducts(): Observable<any> {
    return this.http.get(this.endpoint + 'busses').pipe(map(this.extractData));
  }


  constructor(private _mqttService: MqttService, private http: HttpClient) {
    this.getProducts().subscribe({
      next: event => this.processBusRequest(event),
      error: error => console.log(error),
      complete: () => console.log('Completed http request'),
    });
    const secondsCounter = interval(2000);
    secondsCounter.subscribe(n => {
      this.getProducts().subscribe({
        next: event => this.processBusRequest(event),
        error: error => console.log(error),
        complete: () => console.log('Completed http request'),
      });
    });

    /*
    this.bus_subscription = this._mqttService.observe('/hfp/v1/journey/#').subscribe((message: IMqttMessage) => {

      if (this.mainComponent === undefined || this.mainComponent === null) { return; }

      this.bus_message = <BusLocationMessage>JSON.parse(message.payload.toString());

      try {
        if (!this.mainComponent.map.getBounds().contains([this.bus_message.VP.lat, this.bus_message.VP.long])) {
          // return;
        }
      } catch (error) {
        return;
      }

      const vehicleId = parseInt(this.bus_message.VP.oper + '' + this.bus_message.VP.veh, 10);

      // Update vehicle to vehicles list
      // Give the marker object to the new vehicle in the list
      const old_vehicle_data = this.busses[vehicleId];
      if (old_vehicle_data !== undefined) {
        const marker_obj = old_vehicle_data.marker;
        this.busses[vehicleId] = this.bus_message.VP;
        this.busses[vehicleId].marker = marker_obj;

        const bad = Math.abs(this.busses[vehicleId].dl) / 1.5;
        const green = 255 - bad * 1.5;
        const other_color = bad;

        let myCustomColour;
        if (this.busses[vehicleId].dl < 0) {
          myCustomColour = 'rgba(' + other_color + ', ' + green + ', 0, 1)';
        } else {
          myCustomColour = 'rgba(0, ' + green + ', ' + other_color + ', 1)';
        }

        const markerHtmlStyles = `
          background-color: ${myCustomColour};
          width: 2rem;
          height: 2rem;
          display: block;
          position: relative;
          border-radius: 3rem 3rem 0;
          transform-origin: center;
          transform: translateX(-1rem) translateY(0.5rem) rotate(${this.busses[vehicleId].hdg + 225}deg);
          border: 1px solid #FFFFFF`;

        this.busses[vehicleId].marker.setLatLng([this.bus_message.VP.lat, this.bus_message.VP.long]);
        this.busses[vehicleId].marker.bindPopup('I am: ' + ((this.busses[vehicleId].dl <= 0) ?
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Late') :
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Early')
        ));

        this.busses[vehicleId].marker.setIcon(divIcon({
          className: 'my-custom-pin',
          iconAnchor: [0, 24],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}">
          <center style='transform: rotate(${-this.busses[vehicleId].hdg - 225}deg)'
          >${this.busses[vehicleId].desi}</center></span>`,
        }));
      } else {
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
      console.log(all_vehicles_total_lateness/medium_value_vehicle_amount)
    });*/
  }
  public processBusRequest(busses: any) {
    console.log('Updating Busses');
    busses.forEach(bus => {
      if (this.mainComponent === undefined || this.mainComponent === null) { return; }

      try {
        if (!this.mainComponent.map.getBounds().contains([bus.lat, bus.long])) {
          // return;
        }
      } catch (error) {
        return;
      }

      const vehicleId = parseInt(bus.oper + '' + bus.veh, 10);

      // Update vehicle to vehicles list
      // Give the marker object to the new vehicle in the list
      const old_vehicle_data = this.busses[vehicleId];
      if (old_vehicle_data !== undefined) {
        const marker_obj = old_vehicle_data.marker;
        this.busses[vehicleId] = bus;
        this.busses[vehicleId].marker = marker_obj;

        const bad = Math.abs(this.busses[vehicleId].dl) / 1.5;
        const green = 255 - bad * 1.5;
        const other_color = bad;

        let myCustomColour;
        if (this.busses[vehicleId].dl < 0) {
          myCustomColour = 'rgba(' + other_color + ', ' + green + ', 0, 1)';
        } else {
          myCustomColour = 'rgba(0, ' + green + ', ' + other_color + ', 1)';
        }

        const markerHtmlStyles = `
          background-color: ${myCustomColour};
          width: 2rem;
          height: 2rem;
          display: block;
          position: relative;
          border-radius: 3rem 3rem 0;
          transform-origin: center;
          transform: translateX(-1rem) translateY(0.5rem) rotate(${this.busses[vehicleId].hdg + 225}deg);
          border: 1px solid #FFFFFF`;

        this.busses[vehicleId].marker.setLatLng([bus.lat, bus.long]);
        this.busses[vehicleId].marker.bindPopup('I am: ' + ((this.busses[vehicleId].dl <= 0) ?
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Late') :
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Early')
        ));

        this.busses[vehicleId].marker.setIcon(divIcon({
          className: 'my-custom-pin',
          iconAnchor: [0, 24],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}">
          <center style='transform: rotate(${-this.busses[vehicleId].hdg - 225}deg)'
          >${this.busses[vehicleId].desi}</center></span>`,
        }));
      } else {
        this.busses[vehicleId] = bus;
        this.addMarker(bus.lat, bus.long, vehicleId);
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
    console.log('Succesfully updated Busses!');
  }
  addMarker(lat: any, long: any, vehicleId: number) {

    const bad = Math.abs(this.busses[vehicleId].dl) / 1.5;
    const green = 255 - bad;
    const red = bad;

    let myCustomColour;
    if (this.busses[vehicleId].dl < 0) {
      myCustomColour = 'rgba(' + red + ', ' + green + ', 0, 1)';
    } else {
      myCustomColour = 'rgba(0, ' + green + ', ' + red + ', 1)';
    }


    const markerHtmlStyles = `
    background-color: ${myCustomColour};
    width: 2rem;
    height: 2rem;
    display: block;
    position: relative;
    border-radius: 3rem 3rem 0;
    transform-origin: center;
    transform: translateX(-1rem) translateY(0.5rem) rotate(${this.busses[vehicleId].hdg + 225}deg);
    border: 1px solid #FFFFFF`;

    const newMarker = marker([ lat, long ],
      {icon: divIcon({
        className: 'my-custom-pin',
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
        html: `<span style="${markerHtmlStyles}">
        <center style='transform: rotate(${-this.busses[vehicleId].hdg - 225}deg)'>
        ${this.busses[vehicleId].desi}</center></span>`,
      })}
    );
    newMarker.bindPopup('I am: ' + ((this.busses[vehicleId].dl <= 0) ?
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Late') :
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Early')));
    this.busses[vehicleId].marker = newMarker;
    this.mainComponent.markers.push(newMarker);
  }
  public OnDestroy() {
    this.bus_subscription.unsubscribe();
  }
  public toMMSS(sec_num: number) {
    const minutes = Math.floor(sec_num / 60);
    const seconds = sec_num - (minutes * 60);
    let m_ = minutes + 'm';
    let s_ = seconds + 's';
    if (minutes < 10) {m_ = '0' + m_; }
    if (seconds < 10) {s_ = '0' + s_; }
    return m_ + ' ' + s_ + ' ';
  }
  public unsafePublish(topic: string, message: string): void {
    this._mqttService.unsafePublish(topic, message, {qos: 1, retain: true});
  }
}
