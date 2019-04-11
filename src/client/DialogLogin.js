import React from 'react';
import Typography from '@material-ui/core/Typography';
import Grid from '@material-ui/core/Grid';
import LanguageSelects from './LanguageSelects';
import CharacterSelect from './CharacterSelect';
import Button from '@material-ui/core/Button';
import Icon from '@material-ui/core/Icon';
import IconButton from '@material-ui/core/IconButton';
import StartIcon from '@material-ui/icons/PlayCircleOutlineTwoTone';
import withStyles from '@material-ui/core/styles/withStyles';


const styles = theme => ({
  root: {
      flexGrow: 1,
      justifyContent: 'center',
  },
});

class DialogLogin extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      socket: this.props.socket,
    };
    this.startDialog = this.startDialog.bind(this);
  }

  componentDidMount() {
    this.state.socket.on("resetLogin", (data) => {
      this.state.socket.emit("resetMyData", true);
    });
  }

  componentWillUnmount() {
    this.state.socket.off("resetLogin");
  }

  startDialog() {
    this.state.socket.emit("startDialog", true);
  }

  render(){
    const { classes } = this.props;

    return (
      <React.Fragment>
        <Grid
        item
          container
          direction="row"
          justify="center"
          alignItems="center"
          alignContent="center"
          spacing={32}>

          <div align="center">
            <CharacterSelect socket={this.state.socket}/>
          </div>
          <div align="center">
            <LanguageSelects socket={this.state.socket}/>
          </div>

          <Grid item xs={12}>
            <div align="center">
              <IconButton aria-label="Start Dialog" onClick={this.startDialog} color='primary'>
                <StartIcon style={{ fontSize: 70 }}/>
              </IconButton>
            </div>
          </Grid>

        </Grid>
      </React.Fragment>
    );
  }
}

export default withStyles(styles)(DialogLogin);
