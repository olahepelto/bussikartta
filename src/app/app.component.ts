import { Component } from '@angular/core';
import { tileLayer, latLng, Layer, CRS} from 'leaflet';
import { TrainsService } from './trains.service';
import { BussesService } from './busses.service';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'bussikartta';
  markers: Layer[] = [];
  options = {
    crs: CRS.EPSG3857,
    layers: [
      tileLayer('https://cdn.digitransit.fi/map/v1/hsl-map/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' }),
      tileLayer.wms('https://julkinen.liikennevirasto.fi/inspirepalvelu/avoin/wms?', {layers: 'rataverkko', format: 'image/png', transparent: true})
    ],
    zoom: 11,
    center: latLng(60.222314, 24.892475)
  };


  constructor(private trainService: TrainsService, private bussService: BussesService) {

  }
  public onMapReady(map: any){
    this.bussService.map = map
    this.trainService.map = map
  }
}