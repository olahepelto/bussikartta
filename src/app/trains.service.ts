import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { divIcon, marker } from 'leaflet';
import { Observable, Subscription, interval } from 'rxjs';
import { map } from 'rxjs/operators';


export interface TrainLocationMessage {
  trainNumber: any;
  speed: any;
  location: {
    coordinates: [any, any]
    type: string
  };
}

@Injectable({
  providedIn: 'root'
})
export class TrainsService {
  public mainComponent;
  public trains = [];
  public train_message: TrainLocationMessage;
  private train_subscription: Subscription;

  public endpoint = 'https://rata.digitraffic.fi/api/v1/';
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
    return this.http.get(this.endpoint + 'train-locations/latest/').pipe(map(this.extractData));
  }

  constructor(private http: HttpClient) {
    this.getProducts().subscribe({
      next: event => this.processTrainRequest(event),
      error: error => console.log(error),
      complete: () => console.log('Completed http request'),
    });
    const secondsCounter = interval(5000);
    secondsCounter.subscribe(n => {
      this.getProducts().subscribe({
        next: event => this.processTrainRequest(event),
        error: error => console.log(error),
        complete: () => console.log('Completed http request'),
      });
    });

  }
  processTrainRequest(trains: any) {
    console.log('Updating Trains');
    trains.forEach(train => {
      if (train === undefined) { return; }

      this.train_message = train;

      const vehicleId = parseInt(this.train_message.trainNumber, 10);

      const lat = this.train_message.location.coordinates[1];
      const lon = this.train_message.location.coordinates[0];

      // Trying to rule out all the non visible at least once updated trains
      try {
        if (!this.mainComponent.map.getBounds().contains([lat, lon])) {
          if (this.trains[vehicleId] !== undefined) {
            return;
          }
        }
      } catch (error) {
        return;
      }

      // Update vehicle to trains list
      // Give the marker object to the new vehicle in the list
      const old_vehicle_data = this.trains[vehicleId];
      if (old_vehicle_data !== undefined) {
        const marker_obj = old_vehicle_data.marker;
        this.trains[vehicleId] = this.train_message;
        this.trains[vehicleId].marker = marker_obj;

        /*
        const bad = Math.abs(this.trains[vehicleId].dl)/1.5
        const green = 255-bad*1.5
        const other_color = bad

        let myCustomColour
        if(this.trains[vehicleId].dl < 0){
          myCustomColour = 'rgba('+other_color+', '+green+', 0, 1)'
        }else{
          myCustomColour = 'rgba(0, '+green+', '+other_color+', 1)'
        }*/
        const myCustomColour = 'rgba(0, 255, 0, 1)';

        const markerHtmlStyles = `
          background-color: ${myCustomColour};
          width: 2rem;
          height: 2rem;
          display: block;
          position: relative;
          border-radius: 3rem 3rem 15rem 15rem;
          transform: translateX(-1rem);
          border: 1px solid #000000`;

        this.trains[vehicleId].marker.setLatLng([lat, lon]);
        this.trains[vehicleId].marker.bindPopup('I am: ' + ((this.trains[vehicleId].dl <= 0) ?
          (this.toMMSS(Math.abs(this.trains[vehicleId].dl)) + ' Late') :
          (this.toMMSS(Math.abs(this.trains[vehicleId].dl)) + ' Early')
        ));

        this.trains[vehicleId].marker.setIcon(divIcon({
          className: 'my-custom-pin',
          iconAnchor: [0, 24],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}"><center>${this.trains[vehicleId].trainNumber}</center></span>`
        }));
      } else {
        this.trains[vehicleId] = this.train_message;
        this.addTrainMarker(lat, lon, vehicleId);
      }
      /*let all_trains_total_lateness = 0;
      let medium_value_vehicle_amount = 0;
      for (const key in this.trains) {
        if (this.trains.hasOwnProperty(key)) {
          const vehicle = this.trains[key];
          if(vehicle.dl < 0 && vehicle.dl > -1200){
            all_trains_total_lateness -= vehicle.dl;
            medium_value_vehicle_amount += 1;
          }
        }
      }
      console.log(all_trains_total_lateness/medium_value_vehicle_amount)*/
    });
    console.log('Succesfully updated Trains!');
  }
  addTrainMarker(lat: any, long: any, vehicleId: number) {

    /*
    const bad = Math.abs(this.trains[vehicleId].dl)/1.5
    const green = 255-bad
    const red = bad

    let myCustomColour
    if(this.trains[vehicleId].dl < 0){
      myCustomColour = 'rgba('+red+', '+green+', 0, 1)'
    }else{
      myCustomColour = 'rgba(0, '+green+', '+red+', 1)'
    }
    */
    const myCustomColour = 'rgba(0, 255, 0, 1)';
    const markerHtmlStyles = `
    background-color: ${myCustomColour};
    width: 2rem;
    height: 2rem;
    display: block;
    position: relative;
    border-radius: 3rem 3rem 15rem 15rem;
    transform: translateX(-1rem);
    border: 1px solid #000000`;

    const newMarker = marker([lat, long],
      {
        icon: divIcon({
          className: 'my-custom-pin',
          iconAnchor: [0, 24],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}"><center>${this.trains[vehicleId].trainNumber}</center></span>`
        })
      }
    );
    this.trains[vehicleId].marker = newMarker;
    this.mainComponent.markers.push(newMarker);
  }
  public OnDestroy() {
    this.train_subscription.unsubscribe();
  }
  public toMMSS(sec_num: number) {
    const minutes = Math.floor(sec_num / 60);
    const seconds = sec_num - (minutes * 60);
    let m_ = minutes + 'm';
    let s_ = seconds + 's';
    if (minutes < 10) { m_ = '0' + m_; }
    if (seconds < 10) { s_ = '0' + s_; }
    return m_ + ' ' + s_ + ' ';
  }
}
