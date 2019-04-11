import React from 'react';
import PropTypes from 'prop-types';
import ReactDOM from 'react-dom';
import { withStyles } from '@material-ui/core/styles';
import InputLabel from '@material-ui/core/InputLabel';
import FormControl from '@material-ui/core/FormControl';
import Select from '@material-ui/core/Select';
import Grid from '@material-ui/core/Grid';

const styles = theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    paddingTop: theme.spacing.unit * 4,
  },
  formControl: {
    margin: theme.spacing.unit,
    minWidth: 260,
  },
  selectEmpty: {
    marginTop: theme.spacing.unit * 2,
  },
});

class CharacterSelect extends React.Component {

  constructor(props) {
    super(props);

    this.state = {
      socket: this.props.socket,
      character: 'nietzsche'
    };
  }

  componentDidMount() {

    this.setState({
      labelWidth: ReactDOM.findDOMNode(this.InputLabelRef).offsetWidth,
    });
    console.log("sending character preset");
    this.state.socket.emit("characterName", this.state.character);
  }

  componentWillUnmount(){
  }

  handleCharacterChange = (event) => {
    this.setState({character: event.target.value }, () => function(){
      this.state.socket.emit("characterName", this.state.character);
      console.log("selected " + this.state.character);
    });
  };



  render() {
    const { classes } = this.props;

    return (
      <div className={classes.root}>
        <Grid item xs={12}>
          <FormControl className={classes.formControl}>
            <InputLabel ref={ref => {
              this.InputLabelRef = ref;
            }} htmlFor="synth-select">Select Their Character</InputLabel>
            <Select
              native
              value={this.state.characterSelect}
              onChange={this.handleCharacterChange}
              inputProps={{
                name: 'character_select',
                id: 'character-select',
              }}
            >
            <option key="Nietzsche">Friedrich Nietzsche</option>
           </Select>
          </FormControl>
        </Grid>
      </div>
    );
  }
}

CharacterSelect.propTypes = {
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(CharacterSelect);
