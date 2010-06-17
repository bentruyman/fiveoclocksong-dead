var handle;

var achieved = Array();

exports.init = function (providedHandle) {
	inspect('nerd added');
	handle = providedHandle;
	handle.addListener('front', check);
};

function check (payload) {
	
	var element = handle.getData(payload.user, 'element');
	
	if (!handle.isAchieved(payload.user)){

		if (typeof element === 'undefined') {

			element = {};
			element[payload.element] = 'visited';
			handle.setData(payload.user, 'element', element);
			
		}
		
		if(!element[payload.element]){
			element[payload.element] = 'visited';
			handle.setData(payload.user, 'element', element);
		}
		
		if(element["Node"] === 'visited' && element["CouchDB"] === 'visited' && element["Express"] === 'visited'){

			handle.setData(payload.user, 'element', element);
			handle.achieve(payload.user);
			
		}						
		
	}

}
