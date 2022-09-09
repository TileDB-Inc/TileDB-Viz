type Listener = (data: any) => any;

class PubSub {
  private _subscribers: Record<string, Array<Listener>> = {};

  subscribe(event: string, fn: Listener) {
    if (Array.isArray(this._subscribers[event])) {
      this._subscribers[event].push(fn);
    } else {
      this._subscribers[event] = [fn];
    }
    return () => {
      this.unsubscribe(event, fn);
    };
  }

  removeAllListeners(event: string) {
    this._subscribers[event] = [];
  }

  unsubscribe(event: string, fn: Listener) {
    const subscriberList = this._subscribers[event] || [];
    this._subscribers[event] = subscriberList.filter(sub => sub !== fn);
  }

  publish(event: string, data?: any) {
    if (Array.isArray(this._subscribers[event])) {
      this._subscribers[event].forEach(sub => {
        sub(data);
      });
    }
    return false;
  }
}

export default new PubSub();
