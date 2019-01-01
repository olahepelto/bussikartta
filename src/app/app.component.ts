import { Component } from '@angular/core';
import { tileLayer, latLng, Layer, CRS, marker, circle, Map, Control} from 'leaflet';
import { TrainsService } from './trains.service';
import { BussesService } from './busses.service';
import { TamperebussesService } from './tamperebusses.service';
import { isDevMode } from '@angular/core';
import * as L from 'leaflet';

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
  title = 'bussikartta';
  map;
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

  constructor(public trainService: TrainsService, public bussService: BussesService, public tampereBussService: TamperebussesService) {

  }
  public onMapReady(map: Map) {
    map.attributionControl.addAttribution('Junadata/WFS-vektoritasot Liikennevirasto, lisenssi CC 4.0 BY');
    map.attributionControl.addAttribution('| Digitransit HSL bussidata, api.digitransit.fi');
    map.attributionControl.addAttribution('| Tampereen bussidata, data.itsfactory.fi/');
    map.on('locationfound', this.onLocationFound);
    map.on('moveend', this.onMove);
    this.bussService.mainComponent = this;
    this.trainService.mainComponent = this;
    this.tampereBussService.mainComponent = this;
    this.map = map;
    map.locate();

    L.Control.Watermark = L.Control.extend({
      onAdd: function(map_: Map) {
        const sidebar = L.DomUtil.get('sidebar');
        const img = L.DomUtil.create('img');

        img.src = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
        img.style.width = '200px';

        return sidebar;
      },

      onRemove: function(map_: Map) {
          // Nothing to do here
      }
  });

  L.control.watermark = function(opts) {
      return new L.Control.Watermark(opts);
  };

  L.control.watermark({ position: 'topleft' }).addTo(map);
  }
  public onLocationFound(e: any) {
    const radius = e.accuracy / 2;
    marker(e.latlng).addTo(e.target).bindPopup('You are within ' + radius + ' meters from this point');
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
