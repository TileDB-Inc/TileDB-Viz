export async function waitUntilElementVisible(
  id: string,
  timeout = 1000,
  step = 100
): Promise<boolean> {
  let counter = 0;

  return new Promise(resolve => {
    const intervalID = setInterval(() => {
      counter += step;
      if (document.getElementById(id)) {
        resolve(true);
        clearInterval(intervalID);
      } else if (counter >= timeout) {
        resolve(false);
        clearInterval(intervalID);
      }
    }, step);
  });
}
