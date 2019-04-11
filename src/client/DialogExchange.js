import React from 'react';
import PropTypes from 'prop-types';
import withStyles from '@material-ui/core/styles/withStyles';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import Paper from '@material-ui/core/Paper';
import MultilineOutput from './MultilineOutput';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import CardHeader from '@material-ui/core/CardHeader';
import CardMedia from '@material-ui/core/CardMedia';
import CardContent from '@material-ui/core/CardContent';
import CardActions from '@material-ui/core/CardActions';
import Avatar from '@material-ui/core/Avatar';
import HeadsetIcon from '@material-ui/icons/HeadsetMicTwoTone';
import PersonIcon from '@material-ui/icons/PersonOutlineTwoTone';
import AudioVisualiser from './AudioVisualiser';
import { startStreaming, stopStreaming, animatedStreaming } from './AudioUtils';

let source = null;
let audioBuffer = null;
let active_source = false;

const styles = theme => ({
  card: {
    maxWidth: '98%',
    margin: theme.spacing.unit,
    marginBottom: theme.spacing.unit,
    paddingBottom: theme.spacing.unit,
  },
  myAvatar: {
    color: '#FFFFFF',
    backgroundColor: 'primary',
  },
  theirAvatar: {
    color: '#FFFFFF',
    backgroundColor: 'secondary',
  },
  paper: {
    width: '98%',
    align: 'center',
    paddingTop: '0px',
    marginTop: '0px',
    marginBottom: theme.spacing.unit,
    paddingBottom: theme.spacing.unit,
  },
  button: {
    margin: theme.spacing.unit,
    width: '98%',
    align: 'center',
  },
  statusList: {
    align: 'center',
    paddingTop: '0px',
    marginTop: '0px'
  },
  clientSelected: {
    backgroundColor: "#ce93d8 !important",
  },
  agentSelected: {
    backgroundColor: "#ce93d8 !important",
  }
});

class DialogExchange extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      audio: false,
      theirAudio: false,
      socket: this.props.socket,
      micText: 'Click to Speak',
      character:'',
      username: '',
      myUsername: '',
      myAvatar: '',
      myLanguage: '',
      theirUsername: '',
      theirAvatar: '',
      theirLanguage: '',
      started: false,
      reset: 0,
      audioVizData: new Uint8Array(0),
      recordingDisabled: false,
    };
    this.toggleListen = this.toggleListen.bind(this);
    this.playAudioBuffer = this.playAudioBuffer.bind(this);
    this.tick = this.tick.bind(this);
  }

  componentDidMount() {

    this.state.socket.emit("getCharacterName", true);
    this.state.socket.on("characterName", (data) => {
      this.setState({character: data});
    });
    this.state.socket.on("allStatus", (status) => {
      if(!this.state.theirLanguage){
        status = 'open';
      }
      if(status=='open'){
        this.setState({recordingDisabled: false});
      }
      else if(!this.state.audio){
        this.setState({recordingDisabled: true});
      }
      console.log("status " + status);
      this.setState({selectedIndex: status});
    });
    this.state.socket.on("stopRecording", (data) => {
      this.stopListening();
    });
    this.state.socket.on("updateYourself", (status) => {
      this.state.socket.emit("getUsername", true);
    });
    this.state.socket.on('audiodata', (data) => {
      if(!this.state.started){
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.setState({started:true});
      }
      this.playAudioBuffer(data, this.audioContext, true);
    });
  }

  componentWillUnmount() {
    this.stopListening();
    if(this.audioContext){
      this.audioContext.close();
    }
    this.state.socket.off("audiodata");
    this.state.socket.off("myUsernameIs");

    this.state.socket.off("allStatus");
    this.state.socket.off("updateYourself");
    this.state.socket.off("stopRecording");
  }

  startListening(){
    if(!this.state.started){
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.setState({started:true});
    }
    if(!this.state.audio){
      startStreaming(this.audioContext);
      this.rafId = requestAnimationFrame(this.tick);
      this.dataArray = new Uint8Array(0);
      this.setState({audio: true, started: true});
    }
  }

  tick() {
    let audioVizData = new Uint8Array(0);
    if (!this.state.audio){
      //console.log("not audio viz started");
      animatedStreaming(this.audioContext, this.state.audio);
      this.setState({audio: true, started: true, myStatusText: "Microphone On" });
    }
    else{
      //console.log("audio viz already happeneing");
      audioVizData = animatedStreaming(this.audioContext, this.state.audio);
      this.setState({audio: true, started: true, audioVizData: audioVizData });
      let audioVizBuffer = audioVizData.buffer;
    }

    this.rafId = requestAnimationFrame(this.tick);
  }
  stopListening(){
    if(this.state.audio){
      cancelAnimationFrame(this.rafId);
      stopStreaming(this.audioContext);
      this.setState({audio: false, myStatusText: 'Microphone Off'});
    }
  }
  toggleListen() {
    if (!this.state.started) {
      this.setState({micText: 'Click to Speak', started: true});
    }
    if (this.state.audio) {
      console.log("force final and stop");
      this.state.socket.emit('forceFinal', true);
      this.stopListening();
    } else {
      console.log("starting to listen");
      this.startListening();
    }
  }

  playAudioBuffer(audioFromString, context) {
    if (active_source){
      source.stop(0);
      source.disconnect();
      active_source=false;
    }
    context.decodeAudioData(audioFromString, (buffer) => {
        active_source = true;
        audioBuffer = buffer;
        try {
          source = context.createBufferSource();
          source.buffer = audioBuffer;
          source.loop = false;
          source.connect(context.destination);
          source.start(0);
          active_source = true;
          source.onended = (event) => {
            this.state.socket.emit("audioPlaybackComplete", true);
          };
        } catch (e) {
          console.error(e);
        }


    }, function (e) {
        console.log('Error decoding file', e);
    });
  }
  render(){
    const { classes } = this.props;

    return (
      <React.Fragment>
        <Grid container spacing={8}>

          <Grid item xs={12}>
            <Typography variant='h5' color='primary' align='center'>You are talking to {this.state.character}</Typography>
          </Grid>

          <Grid item xs={12}>
            <div align="center" style={{ marginLeft: -24}} ><AudioVisualiser audioVizData={this.state.audioVizData} color='#1976d2'/></div>
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" className={classes.button} color={this.state.audio ? 'secondary' : 'primary'} onClick={this.toggleListen} disabled={this.state.recordingDisabled} >{this.state.audio ? 'Mic Active' : this.state.micText}</Button>
          </Grid>
          <Grid item xs={12}>
            <MultilineOutput socket={this.state.socket} username={this.state.username}/>
          </Grid>
        </Grid>
      </React.Fragment>
    );
  }
}

DialogExchange.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(DialogExchange);
