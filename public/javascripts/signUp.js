$(document).ready(function() {
  var passwordStrength = $("#passwordStrength")[0];
  var ctx = passwordStrength.getContext("2d");
  ctx.clearRect(0, 0, passwordStrength.width, passwordStrength.height);
  ctx.fillStyle = "white";
  ctx.fillRect(10, 20, passwordStrength.width, passwordStrength.height);

	$("#password").on("input", function() {
		if(typeof zxcvbn === "function") {
			var results = zxcvbn($("#password").val()) || null;
			var score = results.score;

      ctx.fillStyle = "white";
      ctx.fillRect(10, 20, passwordStrength.width, passwordStrength.height);
			
      switch(score) {
				case 1:
					ctx.fillStyle = "red";
					ctx.fillRect(10, 20, passwordStrength.width * .25, passwordStrength.height);
					break;
				case 2:
					ctx.fillStyle = "yellow";
					ctx.fillRect(10, 20, passwordStrength.width * .5, passwordStrength.height);
					break;
				case 3:
					ctx.fillStyle = "blue";
					ctx.fillRect(10, 20, passwordStrength.width * .75, passwordStrength.height);
					break;
				case 4:
					ctx.fillStyle = "green";
					ctx.fillRect(10, 20, passwordStrength.width, passwordStrength.height);
					break;
			}
		}
	});

	$("#signUp").validate({
		rules: {
			confirm: {
				equalTo: "#password"
			}
		},
		messages: {
			fname: "Please enter a first name.",
			lname: "Please enter a last name.",
			email: "Please enter a valid email address.",
			handle: "Please enter a valid chumhandle.",
			password: "Your password must be at least eight characters.",
			confirm: {
				required: "Your password must be at least eight characters.",
				pattern: "Your password must be at least eight characters.",
				equalTo: "Your passwords must match."
			}
		}
	});

	$.validator.addMethod("pattern", function(value, element, param) {
		if (this.optional(element)) {
			return true;
		}
		if (typeof param === "string") {
			param = new RegExp("^(?:" + param + ")$");
		}
		return param.test(value);
	}, "Invalid format.");
	
	$("#email").on("blur", function() {
		$("#emailHint").html("");
		$(this).mailcheck({
			suggested: function(element, suggestion) {
				$("#emailHint").html("Did you mean <a>" + suggestion.full + "</a>?");
			}
		});
	});
	
	$("#emailHint").on("click", function() {
		var suggestion = $("#emailHint a").text();
		$("#emailHint").html("");
		$("#email").val(suggestion);
	});
});