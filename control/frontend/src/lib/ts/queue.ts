
let input_queue = Promise.resolve();

export function queue_input(task: () => Promise<void>) {
	input_queue = input_queue.then(task).catch((err) => {
		console.error('Error in input queue:', err);
	});
}
