import { Component } from '@angular/core';
import { tileLayer, latLng, Layer, CRS, marker, circle, Map, Control, icon} from 'leaflet';
import { TrainsService } from './trains.service';
import { BussesService } from './busses.service';
import { TamperebussesService } from './tamperebusses.service';
import { isDevMode } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/images/marker-icon.png';
import { interval } from 'rxjs/internal/observable/interval';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { map } from 'rxjs/internal/operators/map';

const layerPysakit = tileLayer.wms('https://julkinen.liikennevirasto.fi/inspirepalvelu/avoin/wms?',
{layers: 'DR_PYSAKKI', format: 'image/png', transparent: true});

const layerLiikennepaikat = tileLayer.wms('https://julkinen.liikennevirasto.fi/inspirepalvelu/avoin/wms?',
{layers: 'rautatieliikennepaikka', format: 'image/png', transparent: true});


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: [
    './app.component.scss'
  ]
})
export class AppComponent {
  public sidebarVisible = true;
  public endpoint = isDevMode() ? 'https://localhost:5757/' : 'https://tetrium.fi:5757/';
  public httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };
  public lineChartData_hsl: Array<any> = [
    {data: [], label: 'HSL kartalla', pointRadius: 0.5, pointHoverRadius: 1},
    {data: [], label: 'HSL myöhässä', pointRadius: 0.5, pointHoverRadius: 1},
  ];
  public lineChartLabels_hsl: Array<any> = [];

  public lineChartData_tkl: Array<any> = [
    {data: [], label: 'TKL kartalla', pointRadius: 0.5, pointHoverRadius: 1},
    {data: [], label: 'TKL myöhässä', pointRadius: 0.5, pointHoverRadius: 1},
  ];
  public lineChartLabels_tkl: Array<any> = [];

  title = 'bussikartta';
  map_;
  markers: Layer[] = [];
  options = {
    crs: CRS.EPSG3857,
    layers: [
      tileLayer('https://cdn.digitransit.fi/map/v1/hsl-map/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '' }),
      tileLayer.wms('https://julkinen.liikennevirasto.fi/inspirepalvelu/avoin/wms?',
      {layers: 'rataverkko', format: 'image/png', transparent: true})
    ],
    zoom: 16,
    center: latLng(60.222314, 24.892475)
  };
  private extractData(res: Response) {
    const body = res;
    return body || {};
  }
  getProducts(): Observable<any> {
    return this.http.get(this.endpoint + 'graphs').pipe(map(this.extractData));
  }

  constructor(public trainService: TrainsService, public bussService: BussesService,
    public tampereBussService: TamperebussesService, public http: HttpClient) {
    /*const secondsCounter = interval(60000);
    secondsCounter.subscribe(n => {
      if (bussService.count === 0 || tampereBussService.count === 0) {return; }
      this.newDataPoint([
        Math.round(bussService.count),
        Math.round(bussService.lateCount)
      ],
        new Date().getHours() + ':' + new Date().getMinutes() + ':' + new Date().getSeconds());
    });*/
    this.getProducts().subscribe({
      next: event => this.processGraphRequest(event),
      error: error => console.log(error),
      complete: () => console.log('Got graph history data!'),
    });

    const secondsCounter2 = interval(60000);
    secondsCounter2.subscribe(n => {
    this.getProducts().subscribe({
      next: event => this.processGraphRequest(event),
      error: error => console.log(error),
      complete: () => console.log('Got graph history data!'),
    });
  });
  }
  public processGraphRequest(event: any) {
    this.resetGraphs();

    for (const i in event['hsl']['labels']) {
      if (event['hsl']['labels'].hasOwnProperty(i)) {
        this.newDataPoint(
          [
            event['hsl']['data']['bus_count'][i],
            event['hsl']['data']['bus_late'][i]
          ],
          event['hsl']['labels'][i],
          this.lineChartData_hsl,
          this.lineChartLabels_hsl
        );
      }
    }
    for (const i in event['tampere']['labels']) {
      if (event['tampere']['labels'].hasOwnProperty(i)) {
        this.newDataPoint(
          [
            event['tampere']['data']['bus_count'][i],
            event['tampere']['data']['bus_late'][i]
          ],
          event['tampere']['labels'][i],
          this.lineChartData_tkl,
          this.lineChartLabels_tkl
        );
      }
    }
  }
  public resetGraphs() {
    this.lineChartData_hsl[0]['data'] = [];
    this.lineChartData_hsl[1]['data'] = [];
    this.lineChartLabels_hsl = [];

    this.lineChartData_tkl[0]['data'] = [];
    this.lineChartData_tkl[1]['data'] = [];
    this.lineChartLabels_tkl = [];
  }
  public newDataPoint(dataArr = [100], label, chartData, chartLabels) {
    chartData.forEach((dataset, index) => {
      chartData[index] = Object.assign({}, chartData[index], {
        data: [...chartData[index].data, dataArr[index]]
      });
    });
    chartLabels.push(label);
  }
  public onMapReady(map_: Map) {
    // @ts-ignore
    map_.attributionControl.addAttribution('Kehittänyt Otto Lähepelto, github.com/olahepelto/ ');
    // @ts-ignore
    map_.attributionControl.addAttribution('| Liikennevirasto CC 4.0 BY');
    // @ts-ignore
    map_.attributionControl.addAttribution('| api.digitransit.fi');
    // @ts-ignore
    map_.attributionControl.addAttribution('| data.itsfactory.fi/');
    map_.on('locationfound', this.onLocationFound);
    map_.on('moveend', this.onMove);
    this.bussService.mainComponent = this;
    this.trainService.mainComponent = this;
    this.tampereBussService.mainComponent = this;
    this.map_ = map_;
    map_.locate();
    // @ts-ignore
    L.Control.Watermark = L.Control.extend({
      onAdd: function(map__: Map) {
        const sidebar = L.DomUtil.get('sidebar');
        const img = L.DomUtil.create('img');

        return sidebar;
      },

      onRemove: function(map__: Map) {
          // Nothing to do here
      }
  });

  // @ts-ignore
  L.control.watermark = function(opts) {
    // @ts-ignore
      return new L.Control.Watermark(opts);
  };
  // @ts-ignore
  L.control.watermark({ position: 'topleft' }).addTo(map_);
  }
  public onLocationFound(e: any) {
    const radius = e.accuracy / 2;
    marker(e.latlng, {
      icon: icon({
         iconSize: [ 25, 41 ],
         iconAnchor: [ 13, 41 ],
         iconUrl: 'assets/marker-icon.png',
         shadowUrl: 'assets/marker-shadow.png'
      })
   }).addTo(e.target).bindPopup('You are within ' + Math.round(radius) + ' meters from this point');
    e.target.setView(e.latlng, 16);
  }
  public onMove(e: any) {
    if (e.target.getZoom() < 16 && e.target.hasLayer(layerPysakit)) {
      layerPysakit.removeFrom(e.target);
    }
    if (e.target.getZoom() >= 16 && e.target.hasLayer(layerPysakit) === false) {
      layerPysakit.addTo(e.target);
    }

    if (e.target.getZoom() < 10 && e.target.hasLayer(layerLiikennepaikat)) {
      layerLiikennepaikat.removeFrom(e.target);
    }
    if (e.target.getZoom() >= 10 && e.target.hasLayer(layerLiikennepaikat) === false) {
      layerLiikennepaikat.addTo(e.target);
    }
  }
  public devLog(whatToLog: any) {
    if (isDevMode()) {
      console.log(whatToLog);
    }
  }
}
