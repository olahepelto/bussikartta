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

class Main():

    busses = []
    trains = []
    designations = [None] * 100000
    DO_TRAIN_DESI_UPDATE = False

    def __init__(self):
        print("Initing!")
        self.scheduled_train_update()

        schedule.every(5).minutes.do(self.scheduled_train_update)
        schedule.every(1).seconds.do(self.check_train_desi_update)
        schedule.every(5).minutes.do(self.recache_busses)

        threading.Thread(target=self.start_scheduler).start()
        threading.Thread(target=self.start_mqtt).start()
    def recache_busses(self):
        self.busses = []

    def start_mqtt(self):
        mqttc = mqtt.Client(transport="websockets")
        mqttc.on_message = self.on_message
        mqttc.on_connect = self.on_connect
        mqttc.on_publish = self.on_publish
        mqttc.on_subscribe = self.on_subscribe
        # Uncomment to enable debug messages
        mqttc.on_log = self.on_log
        mqttc.connect("mqtt.hsl.fi", 1883, 60)
        mqttc.subscribe("/hfp/v1/journey/#", 0) # $SYS

        mqttc.loop_forever()

    def get_all_train_designations(self): # TODO: Get train designations
        print("Getting train designations")
        print("Number of trains:", len(self.trains))

        current_train_num = 0
        for train in self.trains:
            current_train_num += 1
            designation = self.get_train_desi_by_id(train["trainNumber"])
            print("Nr", current_train_num, "Train",train["trainNumber"], "designation is:", designation)
            self.designations[train["trainNumber"]] = designation

    def get_train_desi_by_id(self, train_id):
        contents = urllib.request.urlopen("https://rata.digitraffic.fi/api/v1/trains/latest/" + str(train_id)).read()
        train_data = json.loads(str(contents)[2:][:-1].replace("\\", ""))[0]

        train_cat = train_data["trainCategory"]
        train_type = train_data["trainType"]
        commuter_id = train_data["commuterLineID"]

        if(train_cat == "Commuter"):
            return train_cat
        else:
            return train_type + str(train_id)
        

    def start_scheduler(self):
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
        return str(contents)[2:][:-1]

    def check_train_desi_update(self):
        if(self.DO_TRAIN_DESI_UPDATE):
            self.DO_TRAIN_DESI_UPDATE = False
            print("Train designations are not up to date! Updating.")
            self.get_all_train_designations()
            print("Finished train designation update.")

    def scheduled_train_update(self):
        print("Doing train update.")
        self.get_trains()
        print("Succesfully did train update!")

    def on_connect(self, mqttc, obj, flags, rc):
        print("Connected to mqtt server: "+str(rc))

    def on_message(self, mqttc, obj, msg):
        bus = json.loads(str(msg.payload)[2:][:-1])["VP"]
        self.busses[self.get_bus_list_index(bus)] = {"oper": bus["oper"], "veh": bus["veh"], "lat": bus["lat"], "long": bus["long"], "hdg": bus["hdg"], "dl": bus["dl"], "desi": bus["desi"]}

    def get_bus_list_index(self, new_data):
        new_bus_id = int(str(new_data["oper"]) + str(new_data["veh"]))
        
        try:
            for i in range(0, len(self.busses)):
                if(int(str(self.busses[i]["oper"]) + str(self.busses[i]["veh"])) == new_bus_id):
                    return i
        except:
            print("ERROR occured!")
            
        self.busses.append(new_data)
        return len(self.busses)-11

    def on_publish(self, mqttc, obj, mid):
        print("mid: "+str(mid))

    def on_subscribe(self, mqttc, obj, mid, granted_qos):
        print("Subscribed: "+str(mid)+" "+str(granted_qos))

    def on_log(self, mqttc, obj, level, string):
        pass
        # print(string)

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
    return str(main.busses).replace("'","\"").replace("None","\"\"")

@cross_origin()
@app.route("/trains")
def trains():
    return json.dumps(main.get_trains())

@cross_origin()
@app.route("/tampere")
def tampere_busses():
    return main.get_tampere_busses().replace("\\","").replace("None","\"\"")

threading.Thread(target=start_server).start()