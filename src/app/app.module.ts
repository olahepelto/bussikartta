import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BussesService } from './busses.service';
import { TrainsService } from './trains.service';
import {MqttModule} from 'ngx-mqtt';
import { MqttService, IMqttMessage, IMqttServiceOptions } from 'ngx-mqtt';
import { HttpClientModule } from '@angular/common/http';

export const MQTT_SERVICE_OPTIONS: IMqttServiceOptions = {
  hostname: 'mqtt.hsl.fi',
  port: 443,
  protocol: 'wss',
  path: ''
};

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    LeafletModule.forRoot(),
    MqttModule.forRoot(MQTT_SERVICE_OPTIONS),
    HttpClientModule
  ],
  providers: [BussesService, TrainsService],
  bootstrap: [AppComponent]
})
export class AppModule { }
