import {
  HttpClient,
  HttpHeaders
} from '@angular/common/http';
import {
  Injectable
} from '@angular/core';
import {
  divIcon,
  marker
} from 'leaflet';
import {
  Observable,
  Subscription,
  interval
} from 'rxjs';
import {
  map
} from 'rxjs/operators';


export interface TrainLocationMessage {
  trainNumber: any;
  speed: any;
  location: {
    coordinates: [any, any]
    type: string
  };
  designation: any;
}

@Injectable({
  providedIn: 'root'
})
export class TrainsService {
    /*



Radantarkastusvaunu tai muu Liikenneviraston ajo (LIV)
Museojuna, vaihtotyö (MUV)
Päivystäjä, veturi (PAI)
Saatto (SAA)
Työjuna (TYO)
Veturijuna (VET tai VEV)
Lisäveturi, vaihtotyö veturina (VLI)

  */

  public replacements = {
    'HDM': 'Taajamajuna, Dm12',
    'HSM': 'Taajamajuna, Sm',
    'IC': 'InterCity',
    'MUS': 'Museojuna',
    'MV': 'Kalustonsiirtojuna, kaukoliikenne',
    'P': 'Pikajuna',
    'PYO': 'Yöpikajuna',
    'S': 'Pendolino',
    'AE': 'Allegro',
    'PVV': 'Pikajuna, Venäjä',
    'HL': 'Lähijuna',
    'HV': 'Kalustonsiirtojuna, lähiliikenne',
    'HLV': 'Veturivetoinen lähiliikenne',
    'T': 'Tavarajuna',
    'LIV': 'Radantarkastusvaunu tai muu Liikenneviraston ajo',
    'MUV': 'Museojuna, vaihtotyö',
    'PAI': 'Vaihtotyö tavaraliikenne / Päivystäjä, veturi',
    'SAA': 'Saatto',
    'TYO': 'Työjuna',
    'VET': 'Veturijuna',
    'VEV': 'Veturijuna',
    'VLI': 'Lisäveturi, vaihtotyö veturina'
  };

  public count = 0;
  public mainComponent;
  public trains = [];
  public train_message: TrainLocationMessage;

  public mqtt_rest_endpoint = 'https://tetrium.fi:5757/';

  public httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  private extractData(res: Response) {
    const body = res;
    return body || {};
  }
  getProducts(): Observable < any > {
    return this.http.get(this.mqtt_rest_endpoint + 'trains').pipe(map(this.extractData));
  }

  constructor(private http: HttpClient) {
    const secondsCounter = interval(5000);
    secondsCounter.subscribe(n => {
      this.getProducts().subscribe({
        next: event => this.processTrainRequest(event),
        error: error => console.log(error),
        complete: () => this.mainComponent.devLog('Completed trains http request.'),
      });
    });

  }
  public async processTrainRequest(trains: any) {
    this.count = trains.length;
    this.mainComponent.devLog('Updating Trains');

    trains.forEach(train => {
      const lat = train.location.coordinates[1];
      const lon = train.location.coordinates[0];

      // Trying to rule out all the non visible at least once updated trains
      try {
        if (this.mainComponent === undefined || this.mainComponent === null ||
          train === undefined || !this.mainComponent.map.getBounds().contains([lat, lon])) {
          return;
        }
      } catch (error) {
        return;
      }

      const vehicleId = parseInt(train.trainNumber, 10);
      const designation = train.designation;

      if (designation === 'Commuter' || designation === '') {
        return;
      }


      // Update vehicle to trains list
      // Give the marker object to the new vehicle in the list
      const old_vehicle_data = this.trains[vehicleId];

      if (old_vehicle_data !== undefined) {
        const marker_obj = old_vehicle_data.marker;

        this.trains[vehicleId] = train;
        this.trains[vehicleId].marker = marker_obj;

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
        this.trains[vehicleId].marker.bindPopup(this.getTraintypeByDesignation(designation));

        this.trains[vehicleId].marker.setIcon(divIcon({
          className: 'my-custom-pin',
          iconAnchor: [0, 24],
          popupAnchor: [0, -36],
          html: `<span style="${markerHtmlStyles}"><center style='overflow-wrap: break-word;
          word-wrap: break-word;'>${designation}</center></span>`
        }));
      } else {
        this.trains[vehicleId] = train;
        this.addTrainMarker(lat, lon, vehicleId, designation);
      }
    });
    this.mainComponent.devLog('Succesfully updated trains!');
  }
  getTraintypeByDesignation(designation: string) {
    for (const key of Object.keys(this.replacements)) {
      if (true) {
        const replacement = this.replacements[key];
        if (designation.replace(/[0-9]/g, '') === key) {
          return replacement + ' ' + designation.replace(/\D/g, '');
        }
      }
    }
  }

  addTrainMarker(lat: any, long: any, vehicleId: number, designation: any) {

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

    const newMarker = marker([lat, long], {
      icon: divIcon({
        className: 'my-custom-pin',
        iconAnchor: [0, 24],
        popupAnchor: [0, -36],
        html: `<span style="${markerHtmlStyles}"><center style='overflow-wrap: break-word;
        word-wrap: break-word;'>${designation}</center></span>`
      })
    });

    newMarker.bindPopup(this.getTraintypeByDesignation(designation));


    this.trains[vehicleId].marker = newMarker;
    this.mainComponent.markers.push(newMarker);
  }
  public OnDestroy() {

  }
  public toMMSS(sec_num: number) {
    const minutes = Math.floor(sec_num / 60);
    const seconds = sec_num - (minutes * 60);
    let m_ = minutes + 'm';
    let s_ = seconds + 's';
    if (minutes < 10) {
      m_ = '0' + m_;
    }
    if (seconds < 10) {
      s_ = '0' + s_;
    }
    return m_ + ' ' + s_ + ' ';
  }
}
