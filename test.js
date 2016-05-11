/*
  do
    add logic for "negative" associations
      * censorship issues make this trickier

  notes
    this code is for demonstration purposes and is highly unoptimized
*/

// list of all registrants ordered by id#
var registry = [];
// list of gatekeeper id#s
var gatekeepers = [];
// list of steward id#s
var stewards = [];
// list of researcher id#s
var researchers = [];

var selectedId;
var calculatedScores = {
  scaledLocalAssocations: [],
  propagatedAssociations: [],
  percentOfMedianPropagated: []
}

function defaultToNone(value){
  return value ? value : 'none';
}

// helper function for renderToHtml
function generateRegistrantHtml(idNumber){
  var registrant = registry[idNumber];
  if(idNumber == selectedId){
    return `<span style='background-color:#00F;color:#FFF'>id#${idNumber}, ${JSON.stringify(registrant)}</span><br><br>`
  }
  else if(selectedId && (registry[selectedId].type != registry[idNumber].type) && registry[idNumber].type != 'gatekeeper' && !(registry[idNumber].type == 'researcher' && registry[selectedId].type == 'gatekeeper')){
    return `id#${idNumber}, ${JSON.stringify(registrant)}<br>
      <span style='color:#00F'>direct association weight: <b>${defaultToNone(calculatedScores.scaledLocalAssocations[idNumber])}</b>,
      reputation weight: <b>${defaultToNone(calculatedScores.propagatedAssociations[idNumber])}</b>,
      example rating: <b>${defaultToNone(calculatedScores.percentOfMedianPropagated[idNumber])}</b></span><br><br>`
  }
  else return `id#${idNumber}, ${JSON.stringify(registrant)}<br><br>`;
}

function calculateScores(){
  var selected = registry[selectedId];
  calculatedScores = {
    scaledLocalAssocations: [],
    propagatedAssociations: [],
    percentOfMedianPropagated: []
  }
  calculatedScores.scaledLocalAssocations = scaleSumToOne(selected.associations);
  calculatedScores.propagatedAssociations = propagateAssociations(propagateAssociations(calculatedScores.scaledLocalAssocations));
  delete calculatedScores.propagatedAssociations[selectedId];
  calculatedScores.propagatedAssociations = scaleSumToOne(calculatedScores.propagatedAssociations);
  calculatedScores.percentOfMedianPropagated = convertToPointsRatings(calculatedScores.propagatedAssociations);
  for(var id in calculatedScores.scaledLocalAssocations)
    calculatedScores.scaledLocalAssocations[id] = calculatedScores.scaledLocalAssocations[id].toPrecision(3);
  for(var id in calculatedScores.propagatedAssociations)
    calculatedScores.propagatedAssociations[id] = calculatedScores.propagatedAssociations[id].toPrecision(3);
  for(var id in calculatedScores.percentOfMedianPropagated)
    calculatedScores.percentOfMedianPropagated[id] = calculatedScores.percentOfMedianPropagated[id].toPrecision(3);
}

function renderToHtml(){
  var gatekeepers = 'Gatekeepers:<br><br>';
  var stewards = 'Stewards:<br><br>';
  var researchers = 'Researchers:<br><br>';
  if(selectedId) calculateScores();
  for(var i = 0; i < registry.length; i++){
    switch(registry[i].type){
      case 'gatekeeper':
        gatekeepers += generateRegistrantHtml(i);
        break;
      case 'steward':
        stewards += generateRegistrantHtml(i);
        break;
      case 'researcher':
        researchers += generateRegistrantHtml(i);
        break;
    }
  }
  document.getElementById('display').innerHTML = `${gatekeepers}<br>${stewards}<br>${researchers}`;
}

// example of converting weighted reputation to a much more intuitive metric
function convertToPointsRatings(associations){
  var values = [];
  var median;
  var ratings = {};
  for(var id in associations){
    values.push(associations[id]);
  }
  values.sort();
  median = (values.length % 2 ? values[Math.floor(values.length/2)] : (values[values.length/2] + values[values.length/2 - 1])/2);
  for(var id in associations){
    ratings[id] = (associations[id] * 100 / median);
  }
  return ratings;
}

// takes a set of associations and scales their weight so they sum to one
// without this, a given actor could arbitrarily influence the reputation weights of actors associated with the given actor
function scaleSumToOne(set){
  var scaled = {};
  var sum = 0;
  for(var id in set){
    sum += set[id];
  }
  for(var id in set){
    scaled[id] = set[id] / sum;
  }
  return scaled;
}

// takes a set of associations, performs a single step of full propagation on it, and returns the result
// total weight of original associations set is preserved
function propagateAssociations(associations){
  var propagated = {};
  for(var id in associations){
    var scaled = scaleSumToOne(registry[id].associations);
    for(var id2 in scaled){
      if(!propagated[id2]) propagated[id2] = 0;
      propagated[id2] += associations[id] * scaled[id2];
    }
  }
  return propagated;
}

// generate example data
function generateData(){
  /* data generation settings */
  var nGatekeepers = 3;
  var nStewards = 6*3;
  var nResearchers = 9*3;
  // rate at which gatekeepers certify stewards
  var stewardCertificationRate = 0.8;
  // odds that a researcher will make an additional request
  var requestRate = 0.9;
  // odds that a steward will increase their association with a requesting researcher
  var stewardFeedbackRate = 0.9;
  // odds that a researcher will increase their association with a steward requested from
  var researcherFeedbackRate = 0.9;

  /* reinitialize global data variables */
  registry = [];
  gatekeepers = [];
  stewards = [];
  researchers = [];

  /* generate data */
  registry.push({type: 'bootstrap', associations: {}});
  for(var i = 0; i < nGatekeepers; i++){
    var id = registry.length;
    gatekeepers.push(id);
    registry.push({type: 'gatekeeper', associations: {}});
    registry[0].associations[id] = 1;
  }
  for(var i = 0; i < nStewards; i++){
    var id = registry.length;
    stewards.push(id);
    registry.push({type: 'steward', associations: {}});
    for(var j = 0; j < gatekeepers.length; j++){
      if(Math.random() < stewardCertificationRate){
        registry[gatekeepers[j]].associations[id] = 1;
      }
    }
  }
  for(var i = 0; i < nResearchers; i++){
    var id = registry.length;
    researchers.push(id);
    registry.push({type: 'researcher', associations: {0:1}});
    while(Math.random() <= requestRate){
      var selectedSteward = stewards[Math.floor(Math.random()*stewards.length)];
      if(Math.random() <= stewardFeedbackRate)
        registry[selectedSteward].associations[id] ? registry[selectedSteward].associations[id]++ : registry[selectedSteward].associations[id] = 1;
      if(Math.random() <= researcherFeedbackRate)
        registry[id].associations[selectedSteward] ? registry[id].associations[selectedSteward]++ : registry[id].associations[selectedSteward] = 1;
    }
  }
}

function main(){
  var idSelection = document.getElementById('idSelection');
  idSelection.addEventListener('keydown', event => {
    if(event.keyCode == 13){
      if(!isFinite(idSelection.value)) alert('Please enter a numeric id.');
      else if(idSelection.value >= registry.length) alert('Please enter an existing id.');
      else{
        selectedId = idSelection.value
        document.getElementById('selectedId').innerText = selectedId;
        renderToHtml();
      };
      idSelection.value = '';
    }
  });
  generateData();
  renderToHtml();
}

onload = main;
