'use strict';
(async()=>{
 const api=window.EOSQaRecovery,pin=window.EOSQaRecoveryPin,$=id=>document.getElementById(id),status=$('status');let prepared=null,busy=false;
 const refresh=()=>{$('install').disabled=busy||!prepared||!$('closed').checked;$('restore').disabled=busy||!$('closed').checked;$('file').disabled=busy;$('closed').disabled=busy;};
 if(!api.allowedLocation(location)){status.textContent='This tool only works on the separate EOS-503 test site.';return;}
 $('closed').addEventListener('change',refresh);
 $('file').addEventListener('change',async()=>{
  prepared=null;$('games').hidden=true;busy=true;refresh();status.textContent='Checking the prepared QA file...';
  try{const file=$('file').files[0];if(!file||file.size>20000000)throw Error('Select the prepared .eos503qa file.');prepared=await api.validate(await file.text(),pin,crypto.subtle);status.textContent='Completed 99990001 run verified: 10,186 rows. Confirm the game tabs are closed, then load the history.';}catch(e){status.textContent=e.message;}finally{busy=false;refresh();}
 });
 async function act(mode){busy=true;refresh();$('games').hidden=true;status.textContent=mode==='install'?'Preserving the previous QA backup and loading the completed history...':'Restoring the previous QA backup...';let db;
  try{if(!$('closed').checked)throw Error('First close every test game tab.');db=await api.open(indexedDB);const result=mode==='install'?await api.install(db,prepared,true):await api.restore(db,true);
   if(mode==='install'){const actual=await api.read(db,api.key);if(!actual||actual.csv!==prepared.backup)throw Error('The installed history could not be verified. Keep this page open.');status.textContent='Completed QA history loaded and read back correctly.\n'+(result.previousPreserved?'Your earlier QA backup is preserved locally.':'There was no earlier QA research backup.')+'\nOpen ONE version below and log in as 99990001. After its first recovery, close and reopen the browser without loading this prepared file again.';$('games').hidden=false;}
   else status.textContent=result.previousExisted?'Your original QA research backup has been restored. Gameplay saves were left alone.':'The test research history was removed. There was no previous QA research backup. Gameplay saves were left alone.';
  }catch(e){status.textContent=e.message;}finally{if(db)db.close();busy=false;refresh();}
 }
 $('install').addEventListener('click',()=>act('install'));$('restore').addEventListener('click',()=>act('restore'));refresh();
})();
