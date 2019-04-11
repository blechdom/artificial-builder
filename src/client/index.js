import React from 'react';
import ReactDOM from 'react-dom';
import ArtificialDialog from './ArtificialDialog';
import { createMuiTheme } from '@material-ui/core/styles';
import { MuiThemeProvider } from '@material-ui/core/styles';
import brown from '@material-ui/core/colors/brown';
import red from '@material-ui/core/colors/red';

const theme = createMuiTheme({
  palette: {
    primary: brown,
    secondary: red
  },
  typography: {
      useNextVariants: true,
    },
});

ReactDOM.render(<MuiThemeProvider theme={theme}><ArtificialDialog /></MuiThemeProvider>, document.getElementById('root'));
