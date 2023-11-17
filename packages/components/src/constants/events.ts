export enum Events {
  TOGGLE_INPUT_CHANGE = 'toggle-input::change',
  RADIO_GROUP_CHANGE = 'radio-group::change',
  SLIDER_CHANGE = 'tdb-slider::change',
  CONFIRM_BOX_ACCEPT = 'confirmation-box::accept',
  CONFIRM_BOX_SHOW = 'confirmation-box::show',
  FLOATING_BUTTON_CLICK = 'floating-button::click',
  DUAL_SLIDER_CHANGE = 'dual-slider::change',
  COLOR_CHANGE = 'color-input::change',
  ENGINE_INFO_UPDATE = 'engine-info::update',
  BUTTON_CLICK = 'button::clicked',
  PICK_OBJECT = 'picking::object',
  TEXT_INPUT_CHANGE = 'text-input::change',
  SELECT_INPUT_CHANGE = 'select::change'
}

export enum Commands {
  CLEAR = 'command::clear',
  SELECT = 'command::select',
  VISIBILITY = 'command::visibility',
  COLOR = 'command::color',
  ZOOMIN = 'command::zoomin',
  ZOOMOUT = 'command::zoomout',
  RESET = 'command::reset'
}
