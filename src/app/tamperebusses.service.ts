import { Injectable } from '@angular/core';
import { Subscription, Observable, interval } from 'rxjs';
import { divIcon, marker } from 'leaflet';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';

export interface BusLocationMessage {
    'LineRef': {
      'value': any
    };
    'DirectionRef': {
      'value': any
    };
    'FramedVehicleJourneyRef': {
      'DataFrameRef': {
        'value': any
      },
      'DatedVehicleJourneyRef': any
    };
    'OperatorRef': {
      'value': any
    };
    'OriginName': {
      'value': string,
      'lang': string
    };
    'DestinationName': {
      'value': string,
      'lang': string
    };
    'Monitored': boolean;
    'VehicleLocation': {
      'Longitude': any,
      'Latitude': any
    };
    'Bearing': any;
    'Delay': any;
    'VehicleRef': {
      'value': string
    };
}


@Injectable({
  providedIn: 'root'
})
export class TamperebussesService {
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
    return this.http.get(this.endpoint + 'tampere').pipe(map(this.extractData));
  }


  constructor(private http: HttpClient) {
    this.getProducts().subscribe({
      next: event => this.processBusRequest(event),
      error: error => console.log(error),
      complete: () => console.log('Completed http request'),
    });
    const secondsCounter = interval(4000);
    secondsCounter.subscribe(n => {
      this.getProducts().subscribe({
        next: event => this.processBusRequest(event),
        error: error => console.log(error),
        complete: () => console.log('Completed http request'),
      });
    });

  }
  public async processBusRequest(busses: any) {
    console.log('Updating Busses');
    busses = busses['Siri']['ServiceDelivery']['VehicleMonitoringDelivery'][0]['VehicleActivity'];

    busses.forEach(bus_ => {
      const bus = bus_['MonitoredVehicleJourney'] as BusLocationMessage;
      bus['dl'] = this.getDlFromTprFormat(bus.Delay);
      try {
        if (this.mainComponent === undefined || this.mainComponent === null ||
          !this.mainComponent.map.getBounds().contains([bus.VehicleLocation.Latitude, bus.VehicleLocation.Longitude])) {
          return;
        }
      } catch (error) {
        return;
      }
      const vehicleId = parseInt(bus.VehicleRef.value.replace('TKL_', '10')
      .replace('LL_', '20').replace('Paunu_', '30').replace('PTL_', '40'), 10);

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
          transform: translateX(-1rem) translateY(0.5rem) rotate(${this.busses[vehicleId].Bearing + 225}deg);
          border: 1px solid #FFFFFF`;

        this.busses[vehicleId].marker.setLatLng([bus.VehicleLocation.Latitude, bus.VehicleLocation.Longitude]);
        this.busses[vehicleId].marker.bindPopup('I am: ' + ((this.busses[vehicleId].dl <= 0) ?
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Late') :
          (this.toMMSS(Math.abs(this.busses[vehicleId].dl)) + ' Early')
        ));

        this.busses[vehicleId].marker.setIcon(divIcon({
          className: 'my-custom-pin',
          iconAnchor: [0, 24],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}">
          <center style='transform: rotate(${-this.busses[vehicleId].Bearing - 225}deg)'
          >${this.busses[vehicleId].LineRef.value}</center></span>`,
        }));
      } else {
        this.busses[vehicleId] = bus;
        this.addMarker(bus.VehicleLocation.Latitude, bus.VehicleLocation.Longitude, vehicleId);
      }
    });
    console.log('Succesfully updated Busses!');
  }
  getDlFromTprFormat(delay: string) {
    let delaySec = 0;
    try {
      const delayStr = delay.replace('P0Y0M0DT0H', '').replace('.000S', '').split('M');
      if (delayStr.includes('-')) {
        delaySec = parseInt(delayStr[0], 10) * 60 + parseInt(delayStr[1], 10);
      } else {
        delaySec = -parseInt(delayStr[0], 10) * 60 - parseInt(delayStr[1], 10);
      }
    } catch (error) {
      return 0;
    }
    return delaySec;
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
    transform: translateX(-1rem) translateY(0.5rem) rotate(${this.busses[vehicleId].Bearing + 225}deg);
    border: 1px solid #FFFFFF`;

    const newMarker = marker([ lat, long ],
      {icon: divIcon({
        className: 'my-custom-pin',
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
        html: `<span style="${markerHtmlStyles}">
        <center style='transform: rotate(${-this.busses[vehicleId].Bearing - 225}deg)'>
        ${this.busses[vehicleId].LineRef.value}</center></span>`,
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
}
