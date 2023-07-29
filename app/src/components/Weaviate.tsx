import * as React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import { FireBaseServerlessFunctions, WeaviateProps } from '../lib/types';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useSnackbar } from 'notistack';

export default function Weaviate(props: WeaviateProps) {
  const { enqueueSnackbar } = useSnackbar();


  function handleConfig(event: React.MouseEvent<Element, MouseEvent>) {
    enqueueSnackbar('Setting up Weaviate...', { variant: 'info' });
    setTimeout(() => {enqueueSnackbar(`Selected Model is ${props.model}`, { variant: 'info' })}, 100);
    setTimeout(() => {enqueueSnackbar(`Clearing data & Updating Schema`, { variant: 'info' })}, 200);
    httpsCallable(getFunctions(props.app), FireBaseServerlessFunctions.SETUP_WEAVIATE)({data: {model: props.model}})
    .then((response: any)=> {
      if(Object.keys(response.data).includes('operation')){
        enqueueSnackbar(response.data.reason, { variant: 'error' })
      }else{
        enqueueSnackbar('Weaviate is ready!', { variant: 'success' })
        enqueueSnackbar('Seeding Weaviate...', { variant: 'info' });
        httpsCallable(getFunctions(props.app), FireBaseServerlessFunctions.SEED_WEAVIATE)({data: {model: props.model}})
          .then((response: any)=> {
            if(Object.keys(response.data).includes('operation')){
              enqueueSnackbar(response.data.reason, { variant: 'error' })
            }else{
              enqueueSnackbar('Weaviate seeded!', { variant: 'success' })
            }
          })
          .catch((error) => {
            error.message && enqueueSnackbar(error.message, { variant: 'error' })
            enqueueSnackbar('Weaviate seed failed!', { variant: 'error' })
          });
      }
    })
    .catch((error) => {
      error.message && enqueueSnackbar(error.message, { variant: 'error' })
      enqueueSnackbar('Weaviate setup failed!', { variant: 'error' })
    });
    props.handler(event);
  }

  return (
    <div>
      <Dialog
        open={props.open}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">Change The Vectorizer and AI model. </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            This operation will result in the deletion of all the Indexed and Vectorized data.<br/>
            The <a href="https://cdn.statically.io/gh/Brahim-Benzarti/chatbot-redacre/main/faqs.json">FAQs</a> from the GitHub repository will be used,<br/>
            Thus update the file and push it to the repository before proceeding, if you wish to change or add anything.<br/>
            This operation will trigger a serverless function in FireBase, and will take some time to complete.<br/>
            Are you sure you want to proceed?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.handler}>Disagree</Button>
          <Button onClick={handleConfig} autoFocus>Agree</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}