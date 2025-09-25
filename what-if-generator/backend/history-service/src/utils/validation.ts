import Joi from 'joi'

export const createScenarioSchema = Joi.object({
  topic: Joi.string()
    .min(3)
    .max(200)
    .required()
    .messages({
      'string.min': 'Chủ đề phải có ít nhất 3 ký tự',
      'string.max': 'Chủ đề không được vượt quá 200 ký tự',
      'any.required': 'Chủ đề là bắt buộc'
    }),
  content: Joi.string()
    .min(10)
    .max(5000)
    .required()
    .messages({
      'string.min': 'Nội dung phải có ít nhất 10 ký tự',
      'string.max': 'Nội dung không được vượt quá 5000 ký tự',
      'any.required': 'Nội dung là bắt buộc'
    })
})