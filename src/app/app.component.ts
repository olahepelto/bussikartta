import { Component } from '@angular/core';
import { tileLayer, latLng, Layer, CRS, marker, circle} from 'leaflet';
import { TrainsService } from './trains.service';
import { BussesService } from './busses.service';
import { TamperebussesService } from './tamperebusses.service';




@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'bussikartta';
  map;
  markers: Layer[] = [];
  options = {
    crs: CRS.EPSG3857,
    layers: [
      tileLayer('https://cdn.digitransit.fi/map/v1/hsl-map/{z}/{x}/{y}.png', { maxZoom: 18, attribution: '...' }),
      tileLayer.wms('https://julkinen.liikennevirasto.fi/inspirepalvelu/avoin/wms?',
      {layers: 'rataverkko', format: 'image/png', transparent: true})
    ],
    zoom: 11,
    center: latLng(60.222314, 24.892475)
  };


  constructor(public trainService: TrainsService, public bussService: BussesService, public tampereBussesService: TamperebussesService) {

  }
  public onMapReady(map: any) {
    map.on('locationfound', this.onLocationFound);

    this.bussService.mainComponent = this;
    this.trainService.mainComponent = this;
    this.tampereBussesService.mainComponent = this;
    this.map = map;
    map.locate({setView: true, zoom: 11});
  }
  public onLocationFound(e: any) {
    const radius = e.accuracy / 2;
    console.log(e);
    marker(e.latlng).addTo(e.target).bindPopup('You are within ' + radius + ' meters from this point');
    e.target.setZoom(16);
    e.target.flyTo(e.latlng);
  }
}
