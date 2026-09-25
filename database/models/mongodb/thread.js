let _mongoose;
try { _mongoose = require("mongoose"); } catch (_) {}

// Sub-schema for each group member (matches GoatBot V2 members array)
const memberSchema = _mongoose ? new _mongoose.Schema({
  userID:   { type: String, required: true },
  name:     { type: String, default: "Unknown" },
  inGroup:  { type: Boolean, default: true },
  count:    { type: Number, default: 0 },       // message count in this thread
}, { _id: false }) : null;

const threadSchema = (_mongoose && memberSchema) ? new _mongoose.Schema({
  threadID:     { type: String, required: true, unique: true },  // GoatBot V2 key
  threadName:   { type: String, default: "Unknown Group" },
  approvalMode: { type: Boolean, default: false },
  adminIDs:     { type: [String], default: [] },
  members:      { type: [memberSchema], default: [] },           // GoatBot V2 members array
  memberMsgCount: { type: _mongoose.Schema.Types.Mixed, default: {} }, // quick-access msg counts
  banned:       { type: _mongoose.Schema.Types.Mixed, default: {} },
  settings: {
    type: _mongoose.Schema.Types.Mixed,
    default: {
      sendWelcomeMessage: true,
      sendLeaveMessage:   true,
      sendRankupMessage:  false,
      customCommand:      true,
    }
  },
  data:      { type: _mongoose.Schema.Types.Mixed, default: {} }, // per-thread custom data
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: false }) : null;

if (threadSchema) {
  threadSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
  });
}

const ThreadModel = (_mongoose && threadSchema)
  ? (_mongoose.models.Thread || _mongoose.model("Thread", threadSchema))
  : null;

module.exports = ThreadModel;
