import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BussesService } from './busses.service';
import { TrainsService } from './trains.service';
import { Module2Module } from './module2/module2.module';
import {Module3Module} from './module3/module3.module';
import {MqttModule} from 'ngx-mqtt';

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    LeafletModule.forRoot(),
    Module2Module,
    Module3Module,
    MqttModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
