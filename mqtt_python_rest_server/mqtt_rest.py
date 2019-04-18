import paho.mqtt.client as mqtt
import json
import subprocess
import sys
from flask import Flask
from flask import request
import urllib.request
import schedule
import time
import threading
from flask_cors import CORS, cross_origin
from time import localtime, strftime

class Main():
    hsl_bus_graph = {
        "labels": [],
        "data": {
            "bus_count": [],
            "bus_late": [],
            "bus_early": []
        }
    }
    tkl_bus_graph = {
        "labels": [],
        "data": {
            "bus_count": [],
            "bus_late": [],
            "bus_early": []
        }
    }

    busses = []
    trains = []
    designations = [None] * 100000
    DO_TRAIN_DESI_UPDATE = False
    GRAPH_DATA_LIMIT = 1440

    def __init__(self):
        print("Initing!")
        self.scheduled_train_update()
        self.check_train_desi_update()

        threading.Thread(target=self.start_scheduler).start()
        threading.Thread(target=self.start_mqtt).start()
    
    def run_threaded_train_update (self):
        threading.Thread(target=self.scheduled_train_update).start()
    def run_threaded_desi_update (self):
        threading.Thread(target=self.check_train_desi_update).start()
    def run_threaded_recache_busses (self):
        threading.Thread(target=self.recache_busses_update_graph).start()

    def recache_busses_update_graph(self):
        try:
            self.graph_data_update()
        except:
            print("FAILED DOING GRAPH DATA UPDATE ------------------ !!!")
        
        print("RECACHING BUSSES!")
        print("Number of busses before recache: ", len(self.busses));
        # If the mqtt has fucked up, restart
        if(len(self.busses) == 0){
          quit()
        }
        self.busses = []

    def start_mqtt(self):
        mqttc = mqtt.Client(transport="tcp")
        mqttc.on_message = self.on_message
        mqttc.on_connect = self.on_connect
        mqttc.on_publish = self.on_publish
        mqttc.on_subscribe = self.on_subscribe
        # Uncomment to enable debug messages
        mqttc.on_log = self.on_log
        mqttc.connect("mqtt.hsl.fi", 1883, 60)
        mqttc.subscribe("/hfp/v1/journey/ongoing/#", 0) # $SYS
        try:
            mqttc.loop_forever()
        except:
            print("ERROR: MQTT Crashed, restarting thread!")
            threading.Thread(target=self.start_mqtt).start()
        

    def get_all_train_designations(self): # TODO: Get train designations
        print("Getting train designations")
        print("Number of trains:", len(self.trains))

        current_train_num = 0
        for train in self.trains:
            current_train_num += 1
            threading.Thread(target=self.get_train_desi_by_id, args=[train["trainNumber"], current_train_num, train]).start()
            time.sleep(.150)

    def get_train_desi_by_id(self, train_id, current_train_num, train):
        try:
            contents = urllib.request.urlopen("https://rata.digitraffic.fi/api/v1/trains/latest/" + str(train_id)).read()
            train_data = json.loads(str(contents)[2:][:-1].replace("\\", ""))[0]
        except:
            return "ERR";
        

        train_cat = train_data["trainCategory"]
        train_type = train_data["trainType"]
        commuter_id = train_data["commuterLineID"]

        if(train_cat == "Commuter"):
            designation = train_cat
        else:
            designation = train_type + str(train_id)
        self.designations[train["trainNumber"]] = designation
        
    def start_scheduler(self):
        schedule.every(5).minutes.do(self.run_threaded_train_update)
        schedule.every(2).minutes.do(self.run_threaded_desi_update)
        schedule.every(2).minutes.do(self.run_threaded_recache_busses)
        print("Starting scheduler")
        while 1:
            schedule.run_pending()
            time.sleep(1)

    def get_trains(self):
        print("Getting trains")
        contents = urllib.request.urlopen("https://rata.digitraffic.fi/api/v1/train-locations/latest/").read()
        self.trains = json.loads(str(contents)[2:][:-1])
        
        for train in self.trains:
            try:
                train["designation"] = self.designations[train["trainNumber"]]
                if(self.designations[train["trainNumber"]] == None):
                    train["designation"] = ""
                    self.DO_TRAIN_DESI_UPDATE = True
            except:
                train["designation"] = ""
                self.DO_TRAIN_DESI_UPDATE = True
            
        
        # TODO: if trains retrieved this seconds, get cached trains
        return self.trains
    
    def get_tampere_busses(self):
        print("Getting trains")
        contents = urllib.request.urlopen("http://data.itsfactory.fi/siriaccess/vm/json").read()
        self.tampere_busses = json.loads(str(contents)[2:][:-1].replace("\\","").replace("None","\"\""))
        return str(contents)[2:][:-1].replace("\\","").replace("None","\"\"")

    def check_train_desi_update(self):
        if(self.DO_TRAIN_DESI_UPDATE):
            self.DO_TRAIN_DESI_UPDATE = False
            print("Train designations are not up to date! Updating.")
            self.get_all_train_designations()
            print("Finished train designation update.")
            
    def get_dl_from_tpr_format(self, delay):
        delaySec = 0;
        try:
            delayStr = delay.replace('P0Y0M0DT0H', '').replace('.000S', '').split('M');
            if ("-" in delayStr):
                delaySec = int(delayStr[0], 10) * 60 + int(delayStr[1], 10);
            else:
                delaySec = -int(delayStr[0], 10) * 60 - int(delayStr[1], 10);
        except:
            print("Error converting tampere date format!")
            return 0;
        return delaySec;

    def graph_data_update(self):
        print("Updating graph data");
        self.get_tampere_busses()

        hsl_bus_count = 0
        hsl_bus_late = 0
        hsl_bus_early = 0
        tkl_bus_count = 0
        tkl_bus_late = 0
        tkl_bus_early = 0

        for bus in self.busses:
            hsl_bus_count += 1
            try:
                if(int(bus["dl"]) < -120):
                    hsl_bus_late += 1
                elif(int(bus["dl"] > 120)):
                    hsl_bus_early += 1
            except:
                print("ERROR PARSING JSON WHEN UPDATING GRAPH DATA!")

        try:
            for bus in self.tampere_busses['Siri']['ServiceDelivery']['VehicleMonitoringDelivery'][0]['VehicleActivity']:
                try:
                    tkl_bus_count += 1
                    if(self.get_dl_from_tpr_format(bus['MonitoredVehicleJourney']['Delay']) < -120):
                        tkl_bus_late += 1
                    elif(self.get_dl_from_tpr_format(bus['MonitoredVehicleJourney']['Delay']) > 120):
                        tkl_bus_early += 1
                except:
                    print("ERROR: Tried to count tampere busses but failed")      
        except:
            print("ERROR: Tried to get tampere busses key")
        

        #HSL
        self.hsl_bus_graph["labels"].append(strftime("%H:%M:%S", localtime()));
        self.hsl_bus_graph["data"]["bus_count"].append(hsl_bus_count);
        self.hsl_bus_graph["data"]["bus_late"].append(hsl_bus_late);
        self.hsl_bus_graph["data"]["bus_early"].append(hsl_bus_early);

        self.hsl_bus_graph["labels"] = self.hsl_bus_graph["labels"][-self.GRAPH_DATA_LIMIT:];
        self.hsl_bus_graph["data"]["bus_count"] = self.hsl_bus_graph["data"]["bus_count"][-self.GRAPH_DATA_LIMIT:];
        self.hsl_bus_graph["data"]["bus_late"] = self.hsl_bus_graph["data"]["bus_late"][-self.GRAPH_DATA_LIMIT:];
        self.hsl_bus_graph["data"]["bus_early"] = self.hsl_bus_graph["data"]["bus_early"][-self.GRAPH_DATA_LIMIT:];

        # TKL
        self.tkl_bus_graph["labels"].append(strftime("%H:%M:%S", localtime()));
        self.tkl_bus_graph["data"]["bus_count"].append(tkl_bus_count);
        self.tkl_bus_graph["data"]["bus_late"].append(tkl_bus_late);
        self.tkl_bus_graph["data"]["bus_early"].append(tkl_bus_early);

        self.tkl_bus_graph["labels"] = self.tkl_bus_graph["labels"][-self.GRAPH_DATA_LIMIT:];
        self.tkl_bus_graph["data"]["bus_count"] = self.tkl_bus_graph["data"]["bus_count"][-self.GRAPH_DATA_LIMIT:];
        self.tkl_bus_graph["data"]["bus_late"] = self.tkl_bus_graph["data"]["bus_late"][-self.GRAPH_DATA_LIMIT:];
        self.tkl_bus_graph["data"]["bus_early"] = self.tkl_bus_graph["data"]["bus_early"][-self.GRAPH_DATA_LIMIT:];


    def scheduled_train_update(self):
        print("Doing train update.")
        self.get_trains()
        print("Succesfully did train update!")

    def on_connect(self, mqttc, obj, flags, rc):
        print("Connected to mqtt server: "+str(rc))

    def on_message(self, mqttc, obj, msg):
        try:
            bus = json.loads(str(msg.payload)[2:][:-1])["VP"]
            self.busses[self.get_bus_list_index(bus)] = {"oper": bus["oper"], "veh": bus["veh"], "lat": bus["lat"], "long": bus["long"], "hdg": bus["hdg"], "dl": bus["dl"], "desi": bus["desi"]}
        except Exception as e:
            print("ERROR: Failed to receive message!", str(e))

    def get_bus_list_index(self, new_data):
        new_bus_id = int(str(new_data["oper"]) + str(new_data["veh"]))
        
        try:
            for i in range(0, len(self.busses)):
                if(int(str(self.busses[i]["oper"]) + str(self.busses[i]["veh"])) == new_bus_id):
                    return i
        except:
            print("ERROR occured!")
            
        self.busses.append(new_data)
        return len(self.busses) - 1#TODO IS THIS RIGHT?

    def on_publish(self, mqttc, obj, mid):
        print("mid: "+str(mid))

    def on_subscribe(self, mqttc, obj, mid, granted_qos):
        print("Subscribed: "+str(mid)+" "+str(granted_qos))

    def on_log(self, mqttc, obj, level, string):
      pass
      #print("---------------- IMPORTANT LINE ----------------")
      #print(string)

def start_server():
    try:
        print("Trying to start server with mode:", sys.argv[1].replace("-", ""))
        if(sys.argv[1] == "--dev"):
            context = 'adhoc'
        elif(sys.argv[1] == "--prod"):
            context = ('/etc/letsencrypt/live/tetrium.fi/cert.pem', '/etc/letsencrypt/live/tetrium.fi/privkey.pem')
        else:
            print("No argument given, please define eiter --prod or --dev flags.")
            quit()
    except:
        print("ERROR: No argument given, please define eiter --prod or --dev flags. Server not started!")
        quit()
    
    app.run(ssl_context=context, port=5757, host="0.0.0.0")

app = Flask("flask-app")
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

main = Main()

@cross_origin()
@app.route("/busses")
def busses():
    print("Nr of busses:", len(main.busses))
    return str(main.busses).replace("'","\"").replace("None","\"\"")

@cross_origin()
@app.route("/trains")
def trains():
    print("Nr of trains:", len(main.trains))
    return json.dumps(main.get_trains())

@cross_origin()
@app.route("/tampere")
def tampere_busses():
    return main.get_tampere_busses()

@cross_origin()
@app.route("/graphs")
def graphs():
    return "{\"tampere\":" + str(main.tkl_bus_graph).replace("'","\"").replace("None","\"\"") + ", \"hsl\":" + str(main.hsl_bus_graph).replace("'","\"").replace("None","\"\"") + "}";

threading.Thread(target=start_server).start()
