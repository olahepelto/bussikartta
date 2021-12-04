import { Injectable, isDevMode } from '@angular/core';
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
  public translate = 1;
  public count = 0;
  public lateCount = 0;
  public earlyCount = 0;

  public endpoint = isDevMode() ? 'https://localhost:5757/' : 'https://tetrium.fi:5757/';
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
    const secondsCounter = interval(4000);
    secondsCounter.subscribe(n => {
      this.getProducts().subscribe({
        next: event => this.processBusRequest(event),
        error: error => console.log(error),
        complete: () => this.mainComponent.devLog('Completed Tampere busses http request.'),
      });
    });

  }
  public async processBusRequest(busses: any) {
    this.mainComponent.devLog('Updating tampere busses.');
    try {
      busses = busses['Siri']['ServiceDelivery']['VehicleMonitoringDelivery'][0]['VehicleActivity'];
      this.count = busses.length;
    } catch (error) {
      this.count = 0;
      return;
    }

    let lateCounter = 0;
    let earlyCounter = 0;


    this.mainComponent.markers = this.mainComponent.markers.filter(a => a.dragging._marker._popup == undefined)
    busses.forEach(bus_ => {
      const bus = bus_['MonitoredVehicleJourney'] as BusLocationMessage;
      const dl_delay = this.getDlFromTprFormat(bus.Delay);

      bus['dl'] = dl_delay;

      const vehicleId = parseInt(bus.VehicleRef.value.replace('TKL_', '10')
      .replace('LL_', '20').replace('Paunu_', '30').replace('PTL_', '40'), 10);

      if (dl_delay < -120) {
        lateCounter += 1;
      } else if (dl_delay > 120) {
        earlyCounter += 1;
      }

      try {
        if (this.mainComponent === undefined || this.mainComponent === null ||
          !this.mainComponent.map_.getBounds().contains([bus.VehicleLocation.Latitude, bus.VehicleLocation.Longitude])) {
          //return;
        }
      } catch (error) {
        //return;
      }

      // Update vehicle to vehicles list
      // Give the marker object to the new vehicle in the list
      const old_vehicle_data = this.busses[vehicleId];
      this.busses[vehicleId] = bus;
      this.addMarker(bus.VehicleLocation.Latitude, bus.VehicleLocation.Longitude, vehicleId);
    });
    this.busses = []
    this.lateCount = lateCounter;
    this.earlyCount = earlyCounter;
    this.mainComponent.devLog('Succesfully updated tampere busses!');
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
      this.mainComponent.devLog('Error converting date from tampere format!', error);
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
