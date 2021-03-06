/**
* KAD setup a ptop network
*
* deals peer to peer network, tcp, udp, kbuckets etc.
* @class KAD
* @package    Living Knowledge Network Protocol
* @copyright  Copyright (c) 2017 James Littlejohn
* @license    http://www.gnu.org/licenses/old-licenses/gpl-3.0.html
* @version    $Id$
*/
const util = require('util');
const fs = require('fs');
const path = require('path')
const events = require("events");
const kad = require('kad');
const traverse = require('kad-traverse');
const KadLocalStorage = require('kad-localstorage');
const messageFiles = require('kad-fs');
const crypto = require('crypto');
const getIP = require('external-ip')();
//var pouchdbServer = require('./pouchdb-utility.js');

var KAD = function() {

  this.dht = {};
  //this.livepouch = new pouchdbServer();
  this.ipPublic = '';
	events.EventEmitter.call(this);
  this.getpublicIP();

  this.pathdir =  path.join(__dirname, '/');// __dirname;///app.getPath('home');

};

/**
* inherits core emitter class within this class
* @method
*/
util.inherits(KAD, events.EventEmitter);

/**
*  get the Public IP address
* @method getpublicIP
*
*/
KAD.prototype.getpublicIP = function() {

  var localthis = this;
  var ip = '';
  var setIP = getIP;
  setIP(function (err, ip) {
    if (err) {
        // every service in the list has failed
        throw err;
    }
console.log('extippp' + ip);
    localthis.ipPublic = ip;
    localthis.startDHT(8817)
  });

};

/**
*  Start up the DHT  (distributed hash table module)
* @method startDHT
*
*/
KAD.prototype.startDHT = function(portIn) {

  localthis = this;

  var ipaddress =  this.ipPublic;
  // Decorate your transport
  // Create your contact
  var contact = kad.contacts.AddressPortContact({
    address: ipaddress,
    port: 8817//portnumber
  });
  // Decorate your transport
  var NatTransport = traverse.TransportDecorator(kad.transports.UDP);

  // Create your transport with options
  var transportlive = new NatTransport(contact, {
  traverse: {
    upnp: { forward: 1901,
                ttl: 0 },
    stun: { address: 'stun.services.mozilla.com',
                 port: 3478 },
    turn: { address: 'turn.counterpointhackers.org',
                 port: 3478 }
  }
  });

  this.dht = new kad.Node({
    transport: transportlive,
    storage: kad.storage.FS(this.pathdir + '/datadir'),
    validator: 'somethingtocheck'
    //storage: new KadLocalStorage('label')
  });
/*
// local DHT network setup
var ipaddress =  this.ipPublic;
// Decorate your transport
this.dht = new kad.Node({
  transport: kad.transports.UDP(kad.contacts.AddressPortContact({
    address: localthis.ipPublic,//'127.0.0.1',
    port: portIn

    })),
  storage: kad.storage.FS('datadir'),
  validator: 'somethingtocheck'
  //storage: new KadLocalStorage('label')
  });
*/
  if(this.dht)
  {
    var seedData = {};
  	seedData.ip = '52.4.43.80';//'188.166.138.93';//'52.4.43.80';//'127.0.0.1';  // need list of peers
  	seedData.port = 8817;
  	var messagePtoP = {};
  	messagePtoP.type = 'join';
  	messagePtoP.text = 'Welcome to LKN Network';
  	var serialisemessage = JSON.stringify(messagePtoP);
  	seedData.sendmessage = serialisemessage;
    localthis.seedSingle(seedData);

  }

};

/**
*  get current knowledge in network
* @method currentKnowledge
*
*/
KAD.prototype.currentKnowledge = function() {

  var localthis = this;
	this.livepouch.createReadStreamStart(localthis);

};

/**
*  put change listener on all changes to pouchdb
* @method listLocalMessages
*
*/
KAD.prototype.listLocalMessages = function() {

  // try and read all message files in directory
//  var localthis = this;
//  localthis.livepouch.createReadStream(localthis);
// try and read all message files in directory
 var localthis = this;
 var absolutefilepath = localthis.pathdir + 'datadir';
 var testlstore = new messageFiles(absolutefilepath);
 var listfiles = '';

 setInterval(function(){
   listfiles = testlstore.createReadStream();
   var returmesfiledata = [];
   // every time "data" is read, this event fires
   listfiles.on('data', function(textData) {

     localthis.emit("newMfile", textData.value);
     // remove messge from this directory
     if(textData.key)
     {
       var livetextfile = localthis.pathdir + 'datadir/' + textData.key;
       var moveoldstring = localthis.pathdir + 'oldmessages/' + textData.key;
       fs.rename(livetextfile, moveoldstring, function (err) {
         if (err) throw err;
         console.log('Move complete.');
       });
     }

   });

     // the reading is finished...
     listfiles.on('close', function (textData) {

     });

 }	,14)

};

/**
*  Seed a SINGLE connection on DHT
* @method seedSingle
*
*/
KAD.prototype.seedSingle = function(seedIn) {

  var localthis = this;
  var hashkey = crypto.createHash('md5').update(seedIn.sendmessage).digest('hex');

  var seed = {
    address: seedIn.ip,
    port: 8817
  };
console.log(seed);
  var localthis = this;
  this.dht.connect(seed, function(err) {
console.log('begin seed connection');
    var key = hashkey;
    var message = seedIn.sendmessage;
    localthis.putMessage(key, message);

  });

};


/**
*  Make a put call ie send a message (to network)
* @method putMessage
*
*/
KAD.prototype.putMessage = function(keyID, message) {

  var keymid = keyID;
  if(keyID.length == 0)
  {
      var hashkey = crypto.createHash('md5').update(message).digest('hex');
      keymid = hashkey;
  }

  this.dht.put(keymid, message, function() {
console.log('sent message to peers');
    });

};

/**
*  Read a SINGLE message sent by ID
* @method getMessage
*
*/
KAD.prototype.getMessage = function(keyID) {

      var key = keyID;
      var info = '';
      this.dht.get(key, function(err, info) {
console.log('successfully read message');

      });

};
/**
*  Single hop across the peers
* @method oneHop
*
*/
KAD.prototype.oneHop = function(cDmapIN) {

  var localthis = this;
  var nodebuckets = this.dht._router.hopBucketlist();
    var sizebucketsobject = Object.keys(nodebuckets).length;

    // send message to IP node Protocol and then let the protocol go through the Sampling and scoring.
    // needs instant if Dmap Contract and ....
    var hoplist = [];
    var nodelist = [];
    var combinelist = [];
    var bucks = Object.keys(nodebuckets);

    bucks.forEach(function(buc) {

      var bcont = Object.keys(nodebuckets[buc]);

        bcont.forEach(function(bc) {

          var contacts = nodebuckets[buc][bc];

          contacts.forEach(function(cont) {

            var localcont = {};
            localcont = cont;
            var address = Object.keys(localcont);
            var tempholder = [];
            address.forEach(function(item) {

            if(item == 'port')
            {
              hoplist.push(localcont[item]);
              tempholder.push(localcont[item]);
            }
            else if(item == 'nodeID')
            {
              nodelist.push(localcont[item]);
              tempholder.push(localcont[item]);
              combinelist.push(tempholder);
            }
          });
        });
    });

    });
    var rand = nodelist[Math.floor(Math.random() * nodelist.length)];
console.log('rand chosen');
console.log(rand);
    // send message to this peer, update dmap/sampling contract
    var samplingMessage = {};
    samplingMessage.type = 'Dsampling';
    samplingMessage.text = 'chosen';
    samplingMessage.DmapID = cDmapIN;
    samplingMessage.nodeID = rand;
    var serialiseDmessage = JSON.stringify(samplingMessage);
    // send message to network id.
    this.putMessage('', serialiseDmessage)
    // call smart contract
    // POLICY WHAT IS THE properties to get a 'random' walk  one hope two hopes, select, jump over, statifed etc.
};

module.exports = KAD;
