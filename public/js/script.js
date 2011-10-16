(function() {

// LAME CODE, BUT I GOT NO TIME ATM
/* Creating new task */
var locInput = document.getElementById('new_r_location')
var latInput = document.getElementById('new_r_lat');
var lngInput = document.getElementById('new_r_lng');

var autocomplete = new google.maps.places.Autocomplete(locInput);

google.maps.event.addListener(autocomplete, 'place_changed', function() {
  var latLng = autocomplete.getPlace().geometry.location;

  latInput.value = latLng.Ma;
  lngInput.value = latLng.Na;
});


})();