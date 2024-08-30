import { SolverData } from './Types';

function sendSolverRequest(data: SolverData) {
	const url = 'http://localhost:8000/init_solver'

	fetch(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify(data)
	}).then(response => {
		if (response.ok) {
			return response.json();
		} else {
			throw new Error(`Request failed with status ${response.status}. Error ${response.json()}`);
		}
	});
}

export default sendSolverRequest;
