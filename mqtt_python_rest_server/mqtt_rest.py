import paho.mqtt.client as mqtt
import json
import subprocess
import bottle
from bottle import run, post, request, response, get, route
import threading

busses = []

# the decorator
def enable_cors(fn):
    def _enable_cors(*args, **kwargs):
        # set CORS headers
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Origin, Accept, Content-Type, X-Requested-With, X-CSRF-Token'

        if bottle.request.method != 'OPTIONS':
            # actual request; reply with the actual response
            return fn(*args, **kwargs)

    return _enable_cors

@route('/busses',method = 'GET')
@enable_cors
def process():
    return str(busses).replace("'","\"").replace("None","\"\"")

def start_server():
    run(host='tetrium.fi', port=5757, debug=True)

threading.Thread(target=start_server).start()



def on_connect(mqttc, obj, flags, rc):
    print("rc: "+str(rc))

def on_message(mqttc, obj, msg):
    bus = json.loads(str(msg.payload)[2:][:-1])["VP"]
    busses[get_bus_list_index(bus)] = {"oper": bus["oper"], "veh": bus["veh"], "lat": bus["lat"], "long": bus["long"], "hdg": bus["hdg"], "dl": bus["dl"], "desi": bus["desi"]}
    print("Len:", len(busses))

def get_bus_list_index(new_data):
    new_bus_id = int(str(new_data["oper"]) + str(new_data["veh"]))
    
    try:
        for i in range(0, len(busses)):
            if(int(str(busses[i]["oper"]) + str(busses[i]["veh"])) == new_bus_id):
                return i
    except e:
        print(e)
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


