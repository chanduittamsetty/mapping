const axios = require("axios");
const fs = require('fs');
const os =require('os');

const delay = ms => new Promise(res => setTimeout(res, ms));

let hubs=[];
let locations_done=[];
let header1={
    "accept": "application/json",
    "accept-encoding": "gzip",
    "access-control-allow-credentials":"true",
    "appversion":"5.9.0",
    "connection":"Keep-Alive",
    "host":"api.zepto.co.in",
    "platform":"android",
    "sessionid":"undefined",
    "source":"PLAY_STORE",
    "systemversion":"8.0.0",
    "user-agent":"okhttp/3.12.12",
    "x-requested-with":"XMLHttpRequest"
};
let header2={
    "accept-charset":"UTF-8",
    "accept-encoding":"gzip",
    "connection":"Keep-Alive",
    "content-type":"application/json;charset=UTF-8",
    "host":"prod.milkbasket.com",
    "user-agent":"Dalvik/2.1.0 (Linux; U; Android 11; SM-G988N Build/RQ1A.210105.003)",
    "x-newrelic-id":"VQAPUVRTCxAFXVJRBwkPU1I="
}


const locationurl="https://api.zepto.co.in/api/v1/config/layout/?";


const joinlocationurl=(lat,lng)=>{
    return locationurl+"latitude=" + lat+ "&" + "longitude=" + lng+ "&"  + "page_type=HOME"
}
let rawdata = fs.readFileSync("./coordinates/all.geojson");
let parsedraw = JSON.parse(rawdata);
rawdata=null;
let array_locations=parsedraw.features.map((el)=>{
    return el.geometry.coordinates[0]
})
parsedraw=null;
let locations=[]
for(let i=0;i<array_locations.length;i++){
    let arr=array_locations[i];
    while(arr.length!=0){
        locations.push(arr.pop())
    }
}


async function main(){
    for(let j=0;j<locations.length;j++){
        await checkforlocation(locations[j][1],locations[j][0])
        if(j==locations.length-1){
            fs.appendFileSync("delhi_hubs.json",JSON.stringify(hubs)+os.EOL,null,"utf8");
        }
    
    }
    
}
async function checkforlocation(lat,lng){
    if(locations_done.includes(lat+","+lng)){
        console.log("checked")
        return
    }else{
        locations_done.push(lat+","+lng)
    }
while(true){
    let errorCount = 0;
    try{
        let response=await axios.post("https://prod.milkbasket.com/milkbasket_prod_current/consumer/home/nearest_societies",
            {
                "active": 1,
                "latitude": lat,
                "longitude": lng
            },{
                headers:header2
            }
        )
        if(response.data){
            return await checksocieties(response.data["data"]);
        }
    }catch(err){
        if(err.message.includes("getaddrinfo ENOTFOUND prod.milkbasket.com")){
            await delay(2000);
        }
        errorCount++;
        if(errorCount>=5){
            return;
        }
    }
}

}
async function checksocieties(data){
    for(let i=0;i<data.length;i++){
        try{
        let res=await zeptolocation_check(data[i]["latitude"],data[i]["longitude"]);
        
        if(res["serviceable"]==true){
        const searchIndex = hubs.findIndex((el) => el["source_hub_id"]==data[i]["hub_id"] && el["destination_hub_id"]==res["storeId"])
        console.log(searchIndex)
        if(searchIndex!=-1){
            console.log("common")
            let arr=hubs[searchIndex]["common_locations"];
            arr.push({
                latitude:data[i]["latitude"],
                longitude:data[i]["longitude"]
            });
            hubs[searchIndex]["common_locations"]=arr;


        }else{
            console.log(data[i]["hub_id"],",",res["storeId"]);
            let coord=[];
            coord.push({
                latitude:data[i]["latitude"],
                longitude:data[i]["longitude"]
            })
            let obj={
                source_name:"milkbasket",
                source_city_id:data[i]["city_id"],
                source_city_name:data[i]["city"],
                source_hub_id:data[i]["hub_id"],
                source_hub_name:data[i]["hub"],
                common_locations:coord,
                destination_name:"zepto",
                destination_city:data[i]["city"],
                destination_hub_id:res["storeId"]

            }
            hubs.push(obj);
        }
    }
}catch(err){

}
    }

}




async function zeptolocation_check(x,y){
    try{
        const response=  await axios.get(joinlocationurl(x,y),{headers:header1});
        if(response.data){
            console.log(response.data['storeServiceableResponse'])
            return response.data['storeServiceableResponse'];
        }
    }catch(err){
        // console.log(err.message)
    }
    
}
main()




