import paho.mqtt.client as mqtt
import json
import subprocess
import sys
from flask import Flask
app = Flask(__name__)

import threading
from flask_cors import CORS, cross_origin
cors = CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'

busses = []

@app.route("/busses")
@cross_origin()
def process():
    return str(busses).replace("'","\"").replace("None","\"\"")

def start_server():

    try:
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

threading.Thread(target=start_server).start()



def on_connect(mqttc, obj, flags, rc):
    print("rc: "+str(rc))

def on_message(mqttc, obj, msg):
    bus = json.loads(str(msg.payload)[2:][:-1])["VP"]
    busses[get_bus_list_index(bus)] = {"oper": bus["oper"], "veh": bus["veh"], "lat": bus["lat"], "long": bus["long"], "hdg": bus["hdg"], "dl": bus["dl"], "desi": bus["desi"]}
    #print("Len:", len(busses))

def get_bus_list_index(new_data):
    new_bus_id = int(str(new_data["oper"]) + str(new_data["veh"]))
    
    try:
        for i in range(0, len(busses)):
            if(int(str(busses[i]["oper"]) + str(busses[i]["veh"])) == new_bus_id):
                return i
    except:
        print("ERROR occured!")
        
    busses.append(new_data)
    return len(busses)-1

def on_publish(mqttc, obj, mid):
    print("mid: "+str(mid))

def on_subscribe(mqttc, obj, mid, granted_qos):
    print("Subscribed: "+str(mid)+" "+str(granted_qos))

def on_log(mqttc, obj, level, string):
    pass
    # print(string)

# If you want to use a specific client id, use
# mqttc = mqtt.Client("client-id")
# but note that the client id must be unique on the broker. Leaving the client
# id parameter empty will generate a random id for you.
mqttc = mqtt.Client(transport="websockets")
mqttc.on_message = on_message
mqttc.on_connect = on_connect
mqttc.on_publish = on_publish
mqttc.on_subscribe = on_subscribe
# Uncomment to enable debug messages
mqttc.on_log = on_log
mqttc.connect("mqtt.hsl.fi", 1883, 60)
mqttc.subscribe("/hfp/v1/journey/#", 0) # $SYS

mqttc.loop_forever()


