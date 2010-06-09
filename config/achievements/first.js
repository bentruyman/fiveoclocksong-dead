exports.init = function(s){
	
	inspect('First! added');
	
};

exports.event = 'vote';

exports.check = function(s){

	inspect("check achievement: First!");
	
	var condition = false;
	
	return condition;
	
};