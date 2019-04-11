'use strict';
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const speech = require('@google-cloud/speech').v1p1beta1;
const textToSpeech = require('@google-cloud/text-to-speech');
const app = express();

const server = require('http').Server(app);
const io = require('socket.io')(server);

const INPUT_LENGTH = 40;
const CHARS_TO_GENERATE = 200;
const DIVERSITY = 0.5;

app.use(express.static('dist'));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '')));

io.on('connection', (socket) => {
  console.log("New client connected: " + socket.id);
  let username = '',
      speechClient = new speech.SpeechClient(),
      ttsClient = new textToSpeech.TextToSpeechClient(),
      recognizeStream = null,
      character = '',
      ttsText = '',
      botText = '',
      voiceCode = 'en-US-Wavenet-D',
      speechLanguageCode = 'en-US-Wavenet-D';


  socket.on('characterName', function(data){
    character = data;
    console.log("character is " + character);

  });
  socket.on('getCharacterName', function(data){
    socket.emit("characterName", character);
  });

  socket.on('voiceCode', function(data) {
    console.log("voice code: " + data);
    voiceCode = data;
  });

  socket.on('speechLanguageCode', function(data) {
    speechLanguageCode = data;

  });
  socket.on('sttLanguageCode', function(data) {
    sttLanguageCode = data;
  });

  socket.on("startStreaming", function(data){
    startStreaming();
    socket.emit("allStatus", username + ' speaking');
    socket.broadcast.emit("allStatus", username + ' speaking');

  });

  socket.on('binaryStream', function(data) {
    if(recognizeStream!=null) {
      recognizeStream.write(data);
    }
  });

  socket.on("stopStreaming", function(data){
    stopStreaming();
  });


  socket.on("startDialog", function(username){
    console.log("dialog has begun");
    socket.emit("loginToDialog", true);
  });

  socket.on("getUsername", function(data){
    const languageName = convertLanguageCodes(voiceCode.substring(0,5));
    var otherCallersVoiceCode = '';
    var otherLanguage = '';

    if(otherCallersVoiceCode){
      otherLanguage = convertLanguageCodes(otherCallersVoiceCode.substring(0, 5)); //en
    }
    const userInfo = {
      username: username,
      language: languageName,
      otherLanguage: otherLanguage
    };
      socket.emit("myUsernameIs", userInfo);
      socket.broadcast.emit("updateYourself", true);
  });

  socket.on("resetDialog", function(data){
    console.log("resetting dialog");
    //createNewClient();
    socket.emit("resetDialog", true);
  });
  socket.on("leaveDialog", function(data){
    console.log("Dialog complete");

    socket.emit("resetDialog", true);
  });
  socket.on("resetMyData", function(data){

  });
  socket.on('getVoiceList', function(data) {
    async function getList(){
      try {
        const [result] = await ttsClient.listVoices({});
        const voiceList = result.voices;

        voiceList.sort(function(a, b) {
          var textA = a.name.toUpperCase();
          var textB = b.name.toUpperCase();
          return (textA < textB) ? -1 : (textA > textB) ? 1 : 0;
        });
        let languageObject = {};
        let languageName = "";
        let languageCode = "";
        let lastVoice = "";
        let languageTypes = [];

        const formattedVoiceList = [];

        for (let i = 0; i<voiceList.length; i++) {
          const voice = voiceList[i];
          languageCode = voice.languageCodes[0];
          if (languageCode!=lastVoice){
            if (languageObject.languageName!=null){
              languageObject.languageTypes = formatLanguageTypes(languageTypes);
              formattedVoiceList.push(languageObject);

              languageObject = {};
              languageTypes = [];
            }

            languageName = convertLanguageCodes(languageCode);
            languageObject.languageName = languageName;
            languageObject.languageCode = languageCode;

            languageTypes.push({
              voice: voice.name,
              gender: voice.ssmlGender,
              rate: voice.naturalSampleRateHertz
            });
            lastVoice = languageCode;
          } else {
            languageTypes.push({
              voice: voice.name,
              gender: voice.ssmlGender,
              rate: voice.naturalSampleRateHertz
            });
          }
          if(i==(voiceList.length-1)){
              languageObject.languageTypes = formatLanguageTypes(languageTypes);
              formattedVoiceList.push(languageObject);

              languageObject = {};
              languageTypes = [];
          }
        }
        socket.emit('voicelist', JSON.stringify(formattedVoiceList));
      } catch(err) {
        console.log(err);
      }
    }
    getList();
  });

  socket.on('forceFinal', function(data){
    stopStreaming();
    console.log("forcing final");
    if(botText.transcript){

      botText.isfinal = true;
      ttsTranslateAndSendAudio();
    }
    else {
      socket.emit("allStatus", 'open');
      socket.broadcast.emit("allStatus", 'open');
    }
  });

  socket.on("audioPlaybackComplete", function(data){
    console.log("playback complete for " + [socket.id]);
    socket.emit("allStatus", 'open');
    socket.broadcast.emit("allStatus", 'open');
  });
  socket.on("myAudioVizData", function(data){
    socket.broadcast.emit("theirAudioVizData", { buffer: data });
  });
  socket.on('disconnect', function() {
    console.log('client disconnected');
    let userRole = username;

  });

  async function ttsTranslateAndSendAudio(){

    var translateLanguageCode = '';
    var otherCallersVoiceCode = '';

    if(otherCallersVoiceCode){
      var translateLanguageCode = otherCallersVoiceCode.substring(0, 2); //en
      var target = translateLanguageCode;
      console.log("translating into " + target);
      var text = botText.transcript;
      console.log("text to translate: " + text);
      let [translations] = await translate.translate(text, target);
      translations = Array.isArray(translations) ? translations : [translations];
      var translationConcatenated = "";
      translations.forEach((translation, i) => {
        translationConcatenated += translation + " ";
      });
      ttsText = botText.transcript;
      let translatedObject = {
        transcript: botText.transcript,
        //translation: translationConcatenated,
        isfinal: botText.isfinal
      }
      socket.emit("getTranscript", translatedObject);

      var ttsRequest = {
        voice: {
          languageCode: otherCallersVoiceCode.substring(0,5),
          name: otherCallersVoiceCode
        },
        audioConfig: {audioEncoding: 'LINEAR16'},
        input: {text: ttsText}
      };

      const [response] =
        await ttsClient.synthesizeSpeech(ttsRequest);
        socket.broadcast.emit('audiodata', response.audioContent);
        socket.emit("allStatus", username + ' playback');
        socket.broadcast.emit("allStatus", username + ' playback');
    }
    else{
        let translatedObject = {
          transcript: botText.transcript,
          translation: "...waiting for model to load...",
          isfinal: botText.isfinal
        }
        socket.emit("getTranscript", translatedObject);
      console.log("no other caller yet");
    }
  }
  function startStreaming() {
    //audioArray = [];
    let langCode = '';
    if(voiceCode){
      langCode = voiceCode.substring(0,5);
    }

    let sttRequest = {
      config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 44100,
          languageCode: langCode,
          enableAutomaticPunctuation: true
      },
      interimResults: true
    };

    //console.log("startStream request " + JSON.stringify(sttRequest, null, 4));
    if(speechClient){
        recognizeStream = speechClient
          .streamingRecognize(sttRequest)
          .on('error', (error) => {
            console.error;
          })
          .on('data', speechCallback);
    }
  }
    function stopStreaming(){
      if(recognizeStream){
        recognizeStream.removeListener('data', speechCallback);
        recognizeStream = null;
      }
    }
    const speechCallback = (stream) => {
        if (stream.results[0] && stream.results[0].alternatives[0]) {

          console.log(stream.results[0].alternatives[0].transcript);
          var transcriptObject = {
            transcript: stream.results[0].alternatives[0].transcript,
            isfinal: stream.results[0].isFinal
          };

          socket.broadcast.emit("getTheirTranscript", transcriptObject);
          botText = transcriptObject;
          console.log("is final? " + JSON.stringify(botText));


          if(stream.results[0].isFinal){
            socket.emit("stopRecording", true);
            console.log("translate and send audio to other caller");
            ttsTranslateAndSendAudio();
          }
        }
    };

  function formatLanguageTypes(voiceObjects) {
    let voiceTypes = [];
    let voiceSynths = [];

    let lastSynth = '';
    let currentSynth = '';
    let tempVoiceObject = {};

    for (let i = 0; i<voiceObjects.length; i++) {
      currentSynth = voiceObjects[i].voice.slice(6,-2);

      if (currentSynth!=lastSynth) {
        if(tempVoiceObject.voiceSynth!=null) {
          tempVoiceObject.voiceTypes = voiceTypes;
          voiceSynths.push(tempVoiceObject);
          tempVoiceObject = {};
          voiceTypes = [];
        }
        tempVoiceObject.voiceSynth = currentSynth;

        lastSynth = currentSynth;
      }
      voiceTypes.push({
        voiceCode: voiceObjects[i].voice,
        voiceName:
          voiceObjects[i].voice.substr(voiceObjects[i].voice.length - 1) + " (" + voiceObjects[i].gender.substr(0,1).toLowerCase() + ")"
      });

      if(i==(voiceObjects.length-1)) {
        tempVoiceObject.voiceTypes = voiceTypes;
        voiceSynths.push(tempVoiceObject);
        tempVoiceObject = {};
        voiceTypes = [];
      }
    }
    return voiceSynths;
  }

  function convertLanguageCodes(languageCode) {
    let languageName;
    switch (languageCode) {
      case 'ar-XA':
        languageName = "Arabic";
        break;
      case 'da-DK':
        languageName = "Danish";
        break;
      case 'de-DE':
        languageName = "German";
        break;
      case 'en-AU':
        languageName = "English (Australia)"
        break;
      case 'en-GB':
        languageName = "English (United Kingdom)"
        break;
      case 'en-IN':
        languageName = "English (India)";
        break;
      case 'en-US':
        languageName = "English (United States)";
        break;
      case 'es-ES':
        languageName = "Spanish";
        break;
      case 'fr-CA':
        languageName = "French (Canada)";
        break;
      case 'fr-FR':
        languageName = "French";
        break;
      case 'hu-HU':
        languageName = "Hungarian";
        break;
      case 'it-IT':
        languageName = "Italian"
        break;
      case 'ja-JP':
        languageName = "Japanese"
        break;
      case 'ko-KR':
        languageName = "Korean";
        break;
      case 'nl-NL':
        languageName = "Dutch"
        break;
      case 'nb-NO':
        languageName = "Norwegian"
        break;
      case 'pl-PL':
        languageName = "Polish";
        break;
      case 'pt-BR':
        languageName = "Portugese (Brazil)";
        break;
      case 'pt-PT':
        languageName = "Portugese"
        break;
      case 'ru-RU':
        languageName = "Russian";
        break;
      case 'sk-SK':
        languageName = "Slovak (Slovakia)";
        break;
      case 'sv-SE':
        languageName = "Swedish";
        break;
      case 'tr-TR':
        languageName = "Turkish"
        break;
      case 'uk-UA':
        languageName = "Ukrainian (Ukraine)"
        break;
      case 'vi-VN':
        languageName = "Vietnamese"
        break;
      default:
        languageName = languageCode;
    }
    return languageName;
  }
});
if (module === require.main) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    console.log('Press Ctrl+C to quit.');
  });
}
